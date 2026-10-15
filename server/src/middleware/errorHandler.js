import { ERROR_CODES, formatZodIssues } from '@bitbyte/shared';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/** Map body-parser errors (they carry a `type`) to client-safe API errors. */
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': [400, ERROR_CODES.BAD_REQUEST, 'Malformed JSON body.'],
  'entity.too.large': [413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request body is too large.'],
  'charset.unsupported': [415, ERROR_CODES.UNSUPPORTED_MEDIA_TYPE, 'Unsupported charset.'],
  'encoding.unsupported': [
    415,
    ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
    'Unsupported content encoding.',
  ],
};

function isDatabaseUnavailable(err) {
  if (!err) return false;
  if (/^Mongo(ServerSelection|Network|NotConnected)Error$/.test(err.name)) return true;
  return (
    err.name === 'MongooseError' &&
    /initial connection|buffering timed out|not connected/i.test(err.message)
  );
}

/** @returns {AppError} */
export function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError(
      422,
      ERROR_CODES.VALIDATION_ERROR,
      'Request validation failed.',
      formatZodIssues(err),
    );
  }
  // Mongoose validation: report the paths only — messages can contain the rejected values.
  if (err?.name === 'ValidationError' && err.errors) {
    return new AppError(
      422,
      ERROR_CODES.VALIDATION_ERROR,
      'Request validation failed.',
      Object.keys(err.errors).map((path) => ({ path, message: 'Invalid value' })),
    );
  }
  const bodyError = err && BODY_PARSER_ERRORS[err.type];
  if (bodyError) return new AppError(...bodyError);
  if (isDatabaseUnavailable(err)) {
    return new AppError(
      503,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'The service is temporarily unavailable.',
    );
  }
  return new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
}

/** 404 for any route that nothing else handled. */
export function notFound() {
  return (_req, _res, next) =>
    next(new AppError(404, ERROR_CODES.NOT_FOUND, 'Resource not found.'));
}

/**
 * Central error handler: logs with the request ID and sends the safe envelope
 * { error: { code, message, details?, requestId } }. Unknown errors never leak their message
 * or stack. `onUnexpectedError` is the single integration point for optional error tracking (D-022).
 *
 * @param {{ onUnexpectedError?: (err: unknown, req: import('express').Request) => void }} [options]
 */
export function errorHandler({ onUnexpectedError } = {}) {
  // Express identifies error handlers by their four parameters.
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const appError = toAppError(err);
    const expected = err instanceof AppError || appError.status < 500 || isDatabaseUnavailable(err);
    const context = { code: appError.code, status: appError.status, requestId: req.id };
    if (!expected) {
      // Unknown failure: full error (with stack) goes to the log only, never to the client.
      req.log?.error({ err, requestId: req.id }, 'request failed');
      onUnexpectedError?.(err, req);
    } else if (appError.status >= 500) {
      req.log?.warn(context, 'request could not be served');
    } else {
      req.log?.info(context, 'request rejected');
    }

    if (res.headersSent) {
      res.end();
      return;
    }

    const body = { code: appError.code, message: appError.message, requestId: req.id };
    if (appError.details !== undefined) body.details = appError.details;
    res.status(appError.status).set('Cache-Control', 'no-store').json({ error: body });
  };
}
