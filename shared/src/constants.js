/** Versioned API base path shared by the server router and the client API service. */
export const API_PREFIX = '/api/v1';

/** The only administrative role (D-004). Public visitors have no role or account. */
export const ROLES = Object.freeze({ SUPER_ADMIN: 'super_admin' });
export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

/** Header used to correlate a request across client, server logs and error responses (D-022). */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Database connection states reported by the health endpoints (D-041). */
export const DB_STATES = Object.freeze({
  UP: 'up',
  CONNECTING: 'connecting',
  DOWN: 'down',
  DISABLED: 'disabled',
});
