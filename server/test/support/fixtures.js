import { createHash, randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import pino from 'pino';
import { Media, Setting, Taxonomy } from '../../src/models/index.js';

/** A pino logger whose output is kept in memory, so tests can assert what is (not) logged. */
export function captureLogger() {
  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const logger = pino({ level: 'debug' }, stream);
  return { logger, text: () => lines.join('') };
}

/** In-memory media storage double (replaces local disk / Cloudinary). */
export function fakeStorage({ failPut = false, failRemove = false } = {}) {
  const files = new Map();
  return {
    driver: 'local',
    publicDir: '/nonexistent',
    files,
    removed: [],
    failPut,
    failRemove,
    async put({ buffer, ext }) {
      if (this.failPut) throw new Error('provider down');
      const storageKey = `${randomUUID()}.${ext}`;
      files.set(storageKey, buffer);
      return { storageKey, url: `/uploads/${storageKey}`, version: null, format: ext };
    },
    async remove(storageKey) {
      if (this.failRemove) throw new Error('provider down');
      this.removed.push(storageKey);
      files.delete(storageKey);
    },
    variants(media) {
      return [{ width: media.width, url: media.url }];
    },
  };
}

/** Turnstile double: `outcomes` are returned in order, then `fallback`. */
export function fakeTurnstile({ outcomes = [], fallback = 'pass', configured = true } = {}) {
  const calls = [];
  return {
    configured,
    calls,
    async verify(token, options) {
      calls.push({ token, options });
      return { outcome: outcomes.shift() ?? fallback };
    },
  };
}

/** A media document stored directly (no upload), for content that references images. */
export async function createMedia(overrides = {}) {
  const key = randomUUID();
  return Media.create({
    driver: 'local',
    storageKey: `${key}.jpg`,
    url: `/uploads/${key}.jpg`,
    mimeType: 'image/jpeg',
    bytes: 1000,
    width: 1200,
    height: 800,
    alt: 'A described image',
    checksum: createHash('sha256').update(key).digest('hex'),
    ...overrides,
  });
}

export async function createCategory(name = 'IoT', slug = 'iot') {
  return Taxonomy.create({ type: 'projectCategory', name, slug });
}

export const completeService = (overrides = {}) => ({
  title: 'Internet of Things',
  slug: 'internet-of-things',
  summary: 'Connected devices and data.',
  intro: '<p>Verified introduction.</p>',
  ...overrides,
});

export const completeProject = ({ category, cover }, overrides = {}) => ({
  title: 'Smart Meter',
  slug: 'smart-meter',
  summary: 'A connected metering project.',
  category: String(category),
  cover: { media: String(cover) },
  ...overrides,
});

export const completeJob = (overrides = {}) => ({
  title: 'Node.js Developer',
  slug: 'nodejs-developer',
  location: 'Indore',
  employmentType: 'full_time',
  summary: 'Build APIs.',
  description: '<p>Work on our platform.</p>',
  ...overrides,
});

/** Published settings document for a key (bypassing the admin workflow). */
export async function publishSettings(key, content) {
  await Setting.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        draft: content,
        published: content,
        status: 'published',
        hasUnpublishedChanges: false,
        publishedAt: new Date(),
      },
    },
    { upsert: true, runValidators: false },
  );
}

export const LEAD_FORM = Object.freeze({
  budgetOptions: ['Under ₹1 lakh', '₹1–5 lakh'],
  consentText: 'I agree that BitByte may contact me about this enquiry.',
  successMessage: 'Thank you. We will get back to you soon.',
  notificationEmails: ['sales@example.com'],
});
