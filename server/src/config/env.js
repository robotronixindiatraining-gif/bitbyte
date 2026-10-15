import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export class ConfigError extends Error {
  constructor(issues) {
    super(
      `Invalid server configuration:\n${issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n')}`,
    );
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    LOG_PRETTY: booleanString.optional(),
    PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }).optional(),
    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'Must start with mongodb:// or mongodb+srv://')
      .optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    CLIENT_DIST_DIR: z.string().min(1).optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    SESSION_COOKIE_NAME: z
      .string()
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Letters, digits, "_" and "-" only (the __Host- prefix is added in production)',
      )
      .optional(),
    SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(1440).default(120),
    SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(24).default(12),
    TOTP_ENCRYPTION_KEY: z
      .string()
      .refine(
        (v) => Buffer.from(v, 'base64').length === 32,
        'Must be 32 random bytes, base64-encoded',
      )
      .optional(),
    RECOVERY_CODE_PEPPER: z.string().min(32, 'Must be at least 32 characters').optional(),
    IP_HASH_SALT: z.string().min(16, 'Must be at least 16 characters').optional(),
    MAIL_DRIVER: z.enum(['log', 'resend']).default('log'),
    RESEND_API_KEY: z.string().min(10).optional(),
    MAIL_FROM: z.string().min(3).max(200).optional(),
    LEAD_NOTIFICATION_EMAILS: z
      .string()
      .refine(
        (v) => v.split(',').every((item) => EMAIL.test(item.trim())),
        'Comma-separated e-mail addresses',
      )
      .optional(),
    MEDIA_DRIVER: z.enum(['local', 'cloudinary']).optional(),
    MEDIA_LOCAL_DIR: z.string().min(1).optional(),
    CLOUDINARY_URL: z
      .string()
      .regex(
        /^cloudinary:\/\/[^:]+:[^@]+@[a-z0-9_-]+$/i,
        'Expected cloudinary://<key>:<secret>@<cloud>',
      )
      .optional(),
    TURNSTILE_SECRET_KEY: z.string().min(10).optional(),
    TURNSTILE_ALLOWED_HOSTNAMES: z.string().optional(),
    JOBS_ENABLED: booleanString.optional(),
    ROBOTS_ALLOW_INDEXING: booleanString.optional(),
    CANONICAL_HOST: z
      .string()
      .regex(/^[a-z0-9.-]+(:\d+)?$/i, 'A host name such as www.example.com')
      .optional(),
  })
  .superRefine((env, ctx) => {
    if (env.MAIL_DRIVER === 'resend') {
      for (const name of ['RESEND_API_KEY', 'MAIL_FROM']) {
        if (!env[name]) {
          ctx.addIssue({
            code: 'custom',
            path: [name],
            message: 'Required for MAIL_DRIVER=resend',
          });
        }
      }
    }
    if (env.MEDIA_DRIVER === 'cloudinary' && !env.CLOUDINARY_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLOUDINARY_URL'],
        message: 'Required for cloudinary',
      });
    }
    if (env.NODE_ENV !== 'production') return;
    if (!env.PUBLIC_SITE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_SITE_URL'],
        message: 'Required in production',
      });
    } else if (!env.PUBLIC_SITE_URL.startsWith('https://') && !isLocalUrl(env.PUBLIC_SITE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_SITE_URL'],
        message: 'Must use https in production',
      });
    }
    if (!env.MONGODB_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'Required in production' });
    }
    for (const name of ['TOTP_ENCRYPTION_KEY', 'RECOVERY_CODE_PEPPER', 'IP_HASH_SALT']) {
      if (!env[name]) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: 'Required in production (npm run secrets:generate)',
        });
      }
    }
    if (env.MEDIA_DRIVER === 'local') {
      ctx.addIssue({
        code: 'custom',
        path: ['MEDIA_DRIVER'],
        message: 'The local media driver is for development only; use cloudinary',
      });
    }
    if (env.LOG_PRETTY === true) {
      ctx.addIssue({
        code: 'custom',
        path: ['LOG_PRETTY'],
        message: 'Must be false in production',
      });
    }
  });

function parseOrigins(list, issues) {
  return (list ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        issues.push({ path: 'ALLOWED_ORIGINS', message: `Invalid origin: ${value}` });
        return null;
      }
    })
    .filter(Boolean);
}

function parseEmails(list) {
  return (list ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalUrl(value) {
  const { hostname } = new URL(value);
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Treat empty strings (e.g. `MONGODB_URI=` copied from .env.example) as unset. */
function withoutEmptyValues(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
}

/**
 * Validate environment variables and return a frozen configuration object.
 * Throws ConfigError with every problem listed so misconfiguration fails fast at boot.
 * @param {Record<string, string | undefined>} [source]
 */
export function loadConfig(source = process.env) {
  const result = envSchema.safeParse(withoutEmptyValues(source));
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  const env = result.data;
  const isProduction = env.NODE_ENV === 'production';
  const originIssues = [];
  const allowedOrigins = new Set(parseOrigins(env.ALLOWED_ORIGINS, originIssues));
  if (originIssues.length > 0) throw new ConfigError(originIssues);
  if (env.PUBLIC_SITE_URL) allowedOrigins.add(new URL(env.PUBLIC_SITE_URL).origin);
  if (env.NODE_ENV === 'development') allowedOrigins.add('http://localhost:5173');
  const cookieBase = env.SESSION_COOKIE_NAME ?? 'bb_sid';
  return Object.freeze({
    env: env.NODE_ENV,
    isProduction,
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    host: env.HOST,
    logLevel:
      env.LOG_LEVEL ??
      (env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'development' ? 'debug' : 'info'),
    logPretty: env.LOG_PRETTY ?? env.NODE_ENV === 'development',
    publicSiteUrl: env.PUBLIC_SITE_URL ?? null,
    mongodbUri: env.MONGODB_URI ?? null,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    clientDistDir: path.resolve(serverRoot, env.CLIENT_DIST_DIR ?? '../client/dist'),
    jsonBodyLimit: '200kb',
    allowedOrigins: Object.freeze([...allowedOrigins]),
    session: Object.freeze({
      // __Host- cookies must be Secure, Path=/ and host-only (no Domain attribute).
      cookieName: isProduction ? `__Host-${cookieBase}` : cookieBase,
      secureCookie: isProduction,
      idleMs: env.SESSION_IDLE_MINUTES * 60_000,
      absoluteMs: env.SESSION_ABSOLUTE_HOURS * 3_600_000,
    }),
    secrets: Object.freeze({
      totpKey: env.TOTP_ENCRYPTION_KEY ? Buffer.from(env.TOTP_ENCRYPTION_KEY, 'base64') : null,
      recoveryCodePepper: env.RECOVERY_CODE_PEPPER ?? null,
      ipHashSalt: env.IP_HASH_SALT ?? null,
    }),
    mail: Object.freeze({
      driver: env.MAIL_DRIVER,
      resendApiKey: env.RESEND_API_KEY ?? null,
      from: env.MAIL_FROM ?? null,
      leadRecipients: Object.freeze(parseEmails(env.LEAD_NOTIFICATION_EMAILS)),
    }),
    media: Object.freeze({
      // Production without a configured driver: uploads answer 503 until Cloudinary is set up.
      driver: env.MEDIA_DRIVER ?? (isProduction ? 'disabled' : 'local'),
      localDir: path.resolve(serverRoot, env.MEDIA_LOCAL_DIR ?? './uploads'),
      cloudinaryUrl: env.CLOUDINARY_URL ?? null,
    }),
    turnstile: Object.freeze({
      secretKey: env.TURNSTILE_SECRET_KEY ?? null,
      allowedHostnames: Object.freeze(
        (env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean),
      ),
    }),
    // Background jobs (retention purge, notification retries) run in the server process only.
    jobsEnabled: env.JOBS_ENABLED ?? env.NODE_ENV !== 'test',
    // Search engines may index only the production site, and only when explicitly allowed.
    robotsAllowIndexing: isProduction && (env.ROBOTS_ALLOW_INDEXING ?? false),
    // D-028: disabled until the domain configuration is verified (Stage 10).
    canonicalHost: env.CANONICAL_HOST?.toLowerCase() ?? null,
  });
}
