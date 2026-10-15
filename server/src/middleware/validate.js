import { ERROR_CODES, formatZodIssues } from '@bitbyte/shared';
import { AppError } from '../utils/AppError.js';

const PARTS = ['params', 'query', 'body'];

/**
 * Validate request parts with zod schemas. Parsed values are exposed on `req.validated`
 * (Express 5 makes `req.query` read-only, so inputs are never mutated in place).
 *
 * @example router.post('/x', validate({ body: schema }), (req, res) => use(req.validated.body))
 * @param {{ params?: import('zod').ZodType, query?: import('zod').ZodType, body?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    const details = [];
    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) validated[part] = result.data;
      else details.push(...formatZodIssues(result.error, part));
    }
    if (details.length > 0) {
      return next(
        new AppError(422, ERROR_CODES.VALIDATION_ERROR, 'Request validation failed.', details),
      );
    }
    req.validated = validated;
    return next();
  };
}
