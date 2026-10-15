import { z } from 'zod';
import { emailSchema, objectIdSchema, slugSchema } from '../validation.js';

const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript):/i;

/**
 * Builds field helpers for one validation mode (D-009, D-015):
 * - "draft":   lenient. Every field may be missing, formats are not enforced, so partial and
 *              placeholder content ("[CONFIRM …]") can be saved.
 * - "publish": strict. Required fields, formats and limits are enforced before content goes live.
 * Unknown keys are rejected in both modes (no mass assignment).
 * @param {'draft' | 'publish'} mode
 */
export function createKit(mode) {
  const strict = mode === 'publish';
  const kit = {
    mode,
    strict,
    /** Required when publishing, optional in drafts. */
    req: (schema) => (strict ? schema : schema.optional()),
    /** Optional in both modes. */
    opt: (schema) => schema.optional(),
    text: (max, min = 1) =>
      strict
        ? z.string().trim().min(min, 'Required').max(max, `Must be at most ${max} characters`)
        : z.string().max(max, `Must be at most ${max} characters`),
    richText: () => z.string().max(20_000, 'Must be at most 20000 characters'),
    email: () => (strict ? emailSchema : z.string().max(254)),
    httpUrl: () =>
      strict
        ? z.url({ protocol: /^https?$/, message: 'Must be an http(s) URL' })
        : z
            .string()
            .max(2048)
            .refine((v) => !UNSAFE_SCHEME.test(v), 'Unsafe URL'),
    slug: () => (strict ? slugSchema : z.string().max(80)),
    id: () => objectIdSchema,
    bool: () => z.boolean(),
    int: (min, max) => z.number().int().min(min).max(max),
    enumOf: (values) => z.enum(values),
    list: (item, max, min = 0) =>
      strict
        ? z.array(item).min(min, `Add at least ${min}`).max(max, `At most ${max} items`)
        : z.array(item).max(max, `At most ${max} items`),
    object: (shape) => z.object(shape).strict(),
  };
  return kit;
}

export { UNSAFE_SCHEME };
