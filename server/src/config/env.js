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
  })
  .superRefine((env, ctx) => {
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
    if (env.LOG_PRETTY === true) {
      ctx.addIssue({
        code: 'custom',
        path: ['LOG_PRETTY'],
        message: 'Must be false in production',
      });
    }
  });

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
  });
}
