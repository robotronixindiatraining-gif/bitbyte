import { z } from 'zod';

/**
 * Shared validation conventions (docs/ARCHITECTURE.md §2, D-005):
 * - Schemas are zod objects defined once here and reused by client forms and server middleware.
 * - Request schemas are strict: unknown keys are rejected rather than silently stripped.
 * - Validation failures are reported as `{ path, message }` pairs (see formatZodIssues).
 */

/** 24-character hexadecimal MongoDB ObjectId. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

/** URL slug: lowercase letters and digits separated by single hyphens. */
export const slugSchema = z
  .string()
  .min(1, 'Required')
  .max(80, 'Must be at most 80 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

/** Trimmed, lower-cased e-mail address. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Must be a valid e-mail address'));

/**
 * Convert zod issues into the API's `details` format.
 * @param {import('zod').ZodError} error
 * @param {string} [prefix] Optional path prefix such as "body" or "query".
 * @returns {{ path: string, message: string }[]}
 */
export function formatZodIssues(error, prefix) {
  return error.issues.map((issue) => {
    const segments = issue.path.map((segment) => String(segment));
    if (prefix) segments.unshift(prefix);
    return { path: segments.join('.'), message: issue.message };
  });
}
