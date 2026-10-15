import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '@bitbyte/shared';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Attach a request ID for log correlation (D-022). A well-formed incoming X-Request-Id
 * (e.g. from a proxy) is reused; anything else is replaced to prevent log injection.
 */
export function requestId() {
  return (req, res, next) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.id);
    next();
  };
}
