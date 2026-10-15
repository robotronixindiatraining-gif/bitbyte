import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import sharp from 'sharp';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createMediaStorage } from '../src/media/storage.js';
import { processImage } from '../src/media/processImage.js';
import { AuditLog, Media } from '../src/models/index.js';
import { HEADERS, RELAXED_LIMITS, createAdmin, signIn } from './support/auth.js';
import { completeService, fakeStorage } from './support/fixtures.js';
import { useTestDatabase } from './support/db.js';
import { buildApp } from './helpers.js';

useTestDatabase();

const image = (format, { width = 64, height = 48, exif } = {}) => {
  let pipeline = sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 120, b: 200 } },
  });
  if (exif) pipeline = pipeline.withExif(exif);
  return pipeline.toFormat(format).toBuffer();
};
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('processImage (magic bytes, limits, re-encoding)', () => {
  it('accepts JPEG, PNG, WebP and AVIF and re-encodes them', async () => {
    for (const [format, mime] of [
      ['jpeg', 'image/jpeg'],
      ['png', 'image/png'],
      ['webp', 'image/webp'],
      ['avif', 'image/avif'],
    ]) {
      const result = await processImage(await image(format));
      expect(result).toMatchObject({ mimeType: mime, width: 64, height: 48 });
      expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(result.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('rejects SVG, GIF, text and corrupt files regardless of their name', async () => {
    const gif = await image('gif');
    const fakePng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(200, 1),
    ]);
    for (const input of [SVG, gif, Buffer.from('just text'), fakePng, Buffer.alloc(0)]) {
      await expect(processImage(input)).rejects.toMatchObject({
        status: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
    }
  });

  it('strips EXIF metadata and trailing payloads, and caps the longest edge', async () => {
    const withExif = await image('jpeg', {
      exif: { IFD0: { Artist: 'SECRET-ARTIST', Copyright: 'GPS-HOME' } },
    });
    expect(withExif.includes('SECRET-ARTIST')).toBe(true);
    const clean = await processImage(withExif);
    expect(clean.buffer.includes('SECRET-ARTIST')).toBe(false);
    expect((await sharp(clean.buffer).metadata()).exif).toBeUndefined();

    const polyglot = Buffer.concat([await image('png'), Buffer.from('<script>alert(1)</script>')]);
    expect((await processImage(polyglot)).buffer.includes('<script>')).toBe(false);

    const wide = await processImage(await image('png', { width: 5000, height: 100 }));
    expect(wide.width).toBe(4096);
  });

  it('rejects oversized files and dimensions', async () => {
    await expect(processImage(Buffer.alloc(10 * 1024 * 1024 + 1, 0xff))).rejects.toMatchObject({
      status: 413,
    });
    const huge = await sharp({
      create: { width: 12_001, height: 10, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    await expect(processImage(huge)).rejects.toMatchObject({ status: 422 });
  });
});

describe('media API', () => {
  let storage;
  let app;
  let agent;
  beforeEach(async () => {
    storage = fakeStorage();
    app = buildApp({ overrides: { limits: RELAXED_LIMITS, mediaStorage: storage } });
    agent = await signIn(app, await createAdmin());
  });
  const upload = async (buffer, name = 'photo.jpg', fields = { alt: 'Team at work' }) => {
    let req = agent.post('/api/v1/admin/media').set(HEADERS).attach('file', buffer, name);
    for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
    return req;
  };

  it('uploads, stores metadata only, detects duplicates and audits', async () => {
    const buffer = await image('jpeg');
    const res = await upload(buffer, '../../etc/passwd<script>.jpg');
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data).toMatchObject({
      alt: 'Team at work',
      width: 64,
      height: 48,
      mimeType: 'image/jpeg',
      usage: [],
    });
    expect(res.body.data.originalFilename).toBe('passwd_script_.jpg');
    expect(storage.files.size).toBe(1);
    const doc = await Media.findById(res.body.data.id).lean();
    expect(Object.keys(doc)).not.toContain('buffer');
    expect(await AuditLog.exists({ action: 'media.upload', outcome: 'succeeded' })).toBeTruthy();

    const again = await upload(buffer);
    expect(again.status).toBe(200);
    expect(again.body.data.duplicateOf).toBe(res.body.data.id);
    expect(storage.files.size).toBe(1);
  });

  it('rejects SVG, wrong types, oversize uploads, missing files and non-multipart bodies', async () => {
    expect((await upload(SVG, 'logo.svg')).status).toBe(415);
    expect((await upload(Buffer.from('hello'), 'photo.png')).status).toBe(415);
    const big = Buffer.concat([await image('jpeg'), Buffer.alloc(10 * 1024 * 1024, 1)]);
    const tooBig = await upload(big);
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const noFile = await agent.post('/api/v1/admin/media').set(HEADERS).field('alt', 'x');
    expect(noFile.status).toBe(422);
    const json = await agent.post('/api/v1/admin/media').set(HEADERS).send({ alt: 'x' });
    expect(json.status).toBe(415);
    const extraField = await upload(await image('png'), 'a.png', { alt: 'x', role: 'admin' });
    expect(extraField.status).toBe(422);
    expect(await Media.countDocuments()).toBe(0);
    expect(storage.files.size).toBe(0);
  });

  it('leaves no record when the provider fails, and no orphan when the record cannot be saved', async () => {
    storage.failPut = true;
    const down = await upload(await image('png'));
    expect(down.status).toBe(503);
    expect(await Media.countDocuments()).toBe(0);
    expect(await AuditLog.exists({ action: 'media.upload', outcome: 'failed' })).toBeTruthy();

    storage.failPut = false;
    const invalid = await upload(await image('webp'), 'x.webp', {});
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details[0].path).toBe('alt');
    expect(storage.files.size).toBe(0);
    expect(storage.removed).toHaveLength(1);
  });

  it('updates metadata and refuses to delete media that content uses', async () => {
    const media = (await upload(await image('jpeg'))).body.data;
    const patched = await agent
      .patch(`/api/v1/admin/media/${media.id}`)
      .set(HEADERS)
      .send({ alt: 'New alt', tags: ['team'] });
    expect(patched.body.data).toMatchObject({ alt: 'New alt', tags: ['team'] });
    const badPatch = await agent
      .patch(`/api/v1/admin/media/${media.id}`)
      .set(HEADERS)
      .send({ url: 'https://evil' });
    expect(badPatch.status).toBe(422);

    const service = await agent
      .post('/api/v1/admin/services')
      .set(HEADERS)
      .send({ draft: completeService({ heroImage: { media: media.id } }) });
    const inUse = await agent.delete(`/api/v1/admin/media/${media.id}`).set(HEADERS);
    expect(inUse.status).toBe(409);
    expect(inUse.body.error.details).toEqual([
      expect.objectContaining({ kind: 'service', id: service.body.data.id, state: 'draft' }),
    ]);
    expect((await agent.get(`/api/v1/admin/media/${media.id}`)).body.data.usage).toHaveLength(1);

    await agent.delete(`/api/v1/admin/services/${service.body.data.id}`).set(HEADERS).expect(204);
    storage.failRemove = true;
    expect((await agent.delete(`/api/v1/admin/media/${media.id}`).set(HEADERS)).status).toBe(503);
    expect(await Media.exists({ _id: media.id })).toBeTruthy();
    storage.failRemove = false;
    await agent.delete(`/api/v1/admin/media/${media.id}`).set(HEADERS).expect(204);
    expect(await Media.exists({ _id: media.id })).toBeNull();
    expect(storage.files.size).toBe(0);
  });

  it('lists and searches the library', async () => {
    await upload(await image('jpeg'), 'one.jpg', { alt: 'Office front', folder: 'company' });
    await upload(await image('png'), 'two.png', { alt: 'Dashboard screenshot' });
    const all = await agent.get('/api/v1/admin/media?limit=1');
    expect(all.body.meta).toMatchObject({ total: 2, totalPages: 2 });
    const found = await agent.get('/api/v1/admin/media?q=office&folder=company');
    expect(found.body.data.map((m) => m.alt)).toEqual(['Office front']);
  });

  it('rate-limits uploads per session', async () => {
    const limited = buildApp({
      overrides: {
        limits: { ...RELAXED_LIMITS, uploads: { windowMs: 60_000, limit: 1 } },
        mediaStorage: fakeStorage(),
      },
    });
    const a = await signIn(limited, await createAdmin({ email: 'other@example.com' }));
    const first = await a
      .post('/api/v1/admin/media')
      .set(HEADERS)
      .attach('file', await image('png'), 'a.png')
      .field('alt', 'a');
    expect(first.status).toBe(201);
    const second = await a
      .post('/api/v1/admin/media')
      .set(HEADERS)
      .attach('file', await image('jpeg'), 'b.jpg')
      .field('alt', 'b');
    expect(second.status).toBe(429);
  });
});

describe('storage adapters', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'bitbyte-media-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('local driver writes uuid-named files and refuses unexpected keys', async () => {
    const local = createMediaStorage({ driver: 'local', localDir: dir, env: 'test' });
    const stored = await local.put({ buffer: Buffer.from('x'), ext: 'png' });
    expect(stored.storageKey).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(stored.url).toBe(`/uploads/${stored.storageKey}`);
    expect(readdirSync(dir)).toEqual([stored.storageKey]);
    await local.remove(stored.storageKey);
    await local.remove(stored.storageKey); // idempotent
    expect(readdirSync(dir)).toEqual([]);
    await expect(local.remove('../../etc/passwd')).rejects.toThrow('Invalid storage key');
  });

  it('cloudinary driver signs server-side uploads and builds CDN variants (mocked client)', async () => {
    const calls = [];
    const client = {
      uploader: {
        upload_stream(options, callback) {
          calls.push(options);
          return new Writable({
            write(_chunk, _enc, done) {
              done();
            },
            final(done) {
              callback(null, {
                public_id: `${options.folder}/${options.public_id}`,
                secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${options.public_id}.jpg`,
                version: 1,
                format: 'jpg',
              });
              done();
            },
          });
        },
        async destroy(key) {
          calls.push({ destroy: key });
          return { result: key.endsWith('missing') ? 'not found' : 'ok' };
        },
      },
      url: (key, options) =>
        `https://res.cloudinary.com/${options.cloud_name}/w_${options.transformation[0].width}/${key}`,
    };
    const cloud = createMediaStorage({
      driver: 'cloudinary',
      cloudinaryUrl: 'cloudinary://key123:secret456@demo',
      env: 'test',
      client,
    });
    const stored = await cloud.put({ buffer: Buffer.from('x'), ext: 'jpg' });
    expect(calls[0]).toMatchObject({
      folder: 'bitbyte/test',
      overwrite: false,
      resource_type: 'image',
      api_key: 'key123',
      api_secret: 'secret456',
      cloud_name: 'demo',
    });
    expect(stored.storageKey).toMatch(/^bitbyte\/test\/[0-9a-f-]{36}$/);
    expect(stored.url.startsWith('https://')).toBe(true);
    const variants = cloud.variants({ storageKey: stored.storageKey, width: 1300, version: 1 });
    expect(variants.map((v) => v.width)).toEqual([480, 768, 1200, 1300]);
    await cloud.remove('bitbyte/test/missing');
    client.uploader.destroy = async () => ({ result: 'error' });
    await expect(cloud.remove(stored.storageKey)).rejects.toThrow();
    client.uploader.upload_stream = (_o, callback) =>
      new Writable({
        write(_c, _e, done) {
          done();
        },
        final(done) {
          callback(new Error('401 invalid signature secret456'));
          done();
        },
      });
    const failure = await cloud.put({ buffer: Buffer.from('x'), ext: 'jpg' }).catch((e) => e);
    expect(failure.message).not.toContain('secret456');
    expect(() =>
      createMediaStorage({ driver: 'cloudinary', cloudinaryUrl: 'nope', env: 'test' }),
    ).toThrow();
  });
});
