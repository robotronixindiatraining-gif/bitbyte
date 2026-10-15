import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinarySdk } from 'cloudinary';

/** Widths offered to responsive images (`srcset`). */
export const VARIANT_WIDTHS = Object.freeze([480, 768, 1200, 1600, 2400]);

export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Replaceable media storage (D-018). Every driver implements:
 * - `put({ buffer, ext, mimeType, folder })` → `{ storageKey, url, version, format }`
 * - `remove(storageKey)` (idempotent: removing a missing asset succeeds)
 * - `variants(media)` → `[{ width, url }]` for `srcset`
 * Binaries never enter MongoDB; only the returned metadata does.
 *
 * @param {{ driver: 'local' | 'cloudinary', localDir: string, cloudinaryUrl: string | null,
 *   env: string, client?: object }} options `client` replaces the Cloudinary SDK in tests.
 */
export function createMediaStorage({ driver, localDir, cloudinaryUrl, env, client }) {
  if (driver === 'local') return createLocalStorage({ dir: localDir });
  if (driver === 'cloudinary') return createCloudinaryStorage({ cloudinaryUrl, env, client });
  if (driver === 'disabled') return createDisabledStorage();
  throw new Error(`Unsupported media driver: ${driver}`);
}

/** No storage configured (production before Cloudinary credentials exist): uploads fail safely. */
function createDisabledStorage() {
  const fail = async () => {
    throw new StorageError('Media storage is not configured');
  };
  return {
    driver: 'disabled',
    put: fail,
    remove: fail,
    variants: (media) => [{ width: media.width, url: media.url }],
  };
}

/** Development/test storage: files on disk, served by the app at /uploads. */
function createLocalStorage({ dir }) {
  const fileOf = (storageKey) => {
    // Keys are generated here (uuid.ext); refuse anything else so a key can never escape `dir`.
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(storageKey)) {
      throw new StorageError('Invalid storage key');
    }
    return path.join(dir, storageKey);
  };
  return {
    driver: 'local',
    publicDir: dir,
    async put({ buffer, ext }) {
      const storageKey = `${randomUUID()}.${ext}`;
      try {
        await mkdir(dir, { recursive: true });
        await writeFile(fileOf(storageKey), buffer, { flag: 'wx' });
      } catch {
        throw new StorageError('The file could not be stored');
      }
      return { storageKey, url: `/uploads/${storageKey}`, version: null, format: ext };
    },
    async remove(storageKey) {
      const file = fileOf(storageKey);
      try {
        await rm(file, { force: true });
      } catch {
        throw new StorageError('The file could not be removed');
      }
    },
    variants(media) {
      return [{ width: media.width, url: media.url }];
    },
  };
}

function parseCloudinaryUrl(value) {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@([a-z0-9_-]+)$/i.exec(value ?? '');
  if (!match) throw new Error('CLOUDINARY_URL must look like cloudinary://<key>:<secret>@<cloud>');
  return { api_key: match[1], api_secret: match[2], cloud_name: match[3] };
}

/** Production storage: signed server-side uploads to Cloudinary; delivery URLs via its CDN. */
function createCloudinaryStorage({ cloudinaryUrl, env, client }) {
  const sdk = client ?? cloudinarySdk;
  const credentials = parseCloudinaryUrl(cloudinaryUrl);
  // Credentials are passed per call and never exposed to the browser or the logs.
  const auth = { ...credentials, secure: true };
  const folder = `bitbyte/${env}`;

  return {
    driver: 'cloudinary',
    async put({ buffer }) {
      const publicId = randomUUID();
      let result;
      try {
        result = await new Promise((resolve, reject) => {
          const stream = sdk.uploader.upload_stream(
            {
              ...auth,
              folder,
              public_id: publicId,
              resource_type: 'image',
              type: 'upload',
              overwrite: false,
              unique_filename: false,
            },
            (error, value) => (error ? reject(error) : resolve(value)),
          );
          stream.end(buffer);
        });
      } catch {
        throw new StorageError('The media provider rejected or did not accept the upload');
      }
      if (!result?.public_id || !result?.secure_url?.startsWith('https://')) {
        throw new StorageError('The media provider returned an unexpected response');
      }
      return {
        storageKey: result.public_id,
        url: result.secure_url,
        version: result.version ?? null,
        format: result.format ?? null,
      };
    },
    async remove(storageKey) {
      let result;
      try {
        result = await sdk.uploader.destroy(storageKey, {
          ...auth,
          resource_type: 'image',
          invalidate: true,
        });
      } catch {
        throw new StorageError('The media provider could not delete the asset');
      }
      if (result?.result !== 'ok' && result?.result !== 'not found') {
        throw new StorageError('The media provider could not delete the asset');
      }
    },
    variants(media) {
      return VARIANT_WIDTHS.filter((width) => width < media.width)
        .concat(media.width)
        .map((width) => ({
          width,
          url: sdk.url(media.storageKey, {
            cloud_name: credentials.cloud_name,
            secure: true,
            version: media.version ?? undefined,
            transformation: [{ fetch_format: 'auto', quality: 'auto', crop: 'limit', width }],
          }),
        }));
    },
  };
}
