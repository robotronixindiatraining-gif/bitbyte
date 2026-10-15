import { z } from 'zod';
import { objectIdSchema } from '@bitbyte/shared';

/** Request schemas shared by the admin route modules (strict: unknown keys → 422). */
export const idParams = z.object({ id: objectIdSchema }).strict();
export const revision = z.number().int().min(1);
export const revisionBody = z.object({ revision }).strict();
export const draftObject = z.record(z.string(), z.unknown());
export const page = z.coerce.number().int().min(1).max(10_000).default(1);
export const limit = (max = 100, fallback = 20) =>
  z.coerce.number().int().min(1).max(max).default(fallback);
export const search = z.string().trim().min(1).max(100).optional();
export const queryBoolean = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
