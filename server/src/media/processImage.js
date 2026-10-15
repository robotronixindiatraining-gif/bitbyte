import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { ERROR_CODES } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Longest edge after normalisation; larger originals are scaled down. */
export const MAX_OUTPUT_EDGE = 4096;
/** Decoder limits: refuse images whose pixel count could exhaust memory (decompression bombs). */
export const MAX_INPUT_EDGE = 12_000;
export const MAX_INPUT_PIXELS = 40_000_000;

/** Allowed formats, checked by magic bytes (file-type) AND by the decoder (sharp). */
const FORMATS = Object.freeze({
  'image/jpeg': {
    sharp: ['jpeg'],
    ext: 'jpg',
    encode: (img) => img.jpeg({ quality: 85, mozjpeg: true }),
  },
  'image/png': { sharp: ['png'], ext: 'png', encode: (img) => img.png({ compressionLevel: 9 }) },
  'image/webp': { sharp: ['webp'], ext: 'webp', encode: (img) => img.webp({ quality: 85 }) },
  'image/avif': {
    sharp: ['heif', 'avif'],
    ext: 'avif',
    encode: (img) => img.avif({ quality: 60 }),
  },
});
export const ALLOWED_MIME_TYPES = Object.freeze(Object.keys(FORMATS));

const unsupported = () =>
  new AppError(
    415,
    ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
    'Upload a JPEG, PNG, WebP or AVIF image. SVG, GIF and HEIC files are not accepted.',
  );

const hex = (n) => n.toString(16).padStart(2, '0');

/**
 * Verify and normalise an uploaded image (D-013, D-018):
 * 1. magic bytes must identify an allowed format (the browser's MIME type and file name are ignored);
 * 2. the decoder must agree on the format, and the dimensions must be within limits;
 * 3. the image is auto-rotated, scaled to at most MAX_OUTPUT_EDGE and RE-ENCODED, which drops
 *    EXIF/GPS and any other metadata or trailing payload.
 *
 * @param {Buffer} input
 * @returns {Promise<{ buffer: Buffer, mimeType: string, ext: string, width: number, height: number,
 *   bytes: number, dominantColor: string, checksum: string }>}
 */
export async function processImage(input) {
  if (!Buffer.isBuffer(input) || input.length === 0) throw unsupported();
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Images must be 10 MB or smaller.');
  }
  const detected = await fileTypeFromBuffer(input);
  const format = detected && FORMATS[detected.mime];
  if (!format) throw unsupported();

  const decoderOptions = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' };
  let metadata;
  try {
    metadata = await sharp(input, decoderOptions).metadata();
  } catch {
    throw unsupported();
  }
  if (!format.sharp.includes(metadata.format)) throw unsupported();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > MAX_INPUT_EDGE ||
    metadata.height > MAX_INPUT_EDGE ||
    metadata.width * metadata.height > MAX_INPUT_PIXELS
  ) {
    throw new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'The image dimensions are too large.', [
      { path: 'file', message: `At most ${MAX_INPUT_EDGE} px per side and 40 megapixels` },
    ]);
  }

  let output;
  try {
    const pipeline = sharp(input, decoderOptions).rotate().resize({
      width: MAX_OUTPUT_EDGE,
      height: MAX_OUTPUT_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    output = await format.encode(pipeline).toBuffer({ resolveWithObject: true });
  } catch {
    throw unsupported();
  }
  const { dominant } = await sharp(output.data).stats();

  return {
    buffer: output.data,
    mimeType: detected.mime,
    ext: format.ext,
    width: output.info.width,
    height: output.info.height,
    bytes: output.data.length,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    // Checksum of the ORIGINAL upload: uploading the same file twice is detected as a duplicate.
    checksum: createHash('sha256').update(input).digest('hex'),
  };
}
