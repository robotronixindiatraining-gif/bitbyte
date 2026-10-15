import { API_PREFIX, ERROR_CODES } from '@bitbyte/shared';

/** Normalised API failure; mirrors the server envelope { error: { code, message, details, requestId } }. */
export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId ?? null;
  }
}

/**
 * The only place the client calls `fetch` (docs/ARCHITECTURE.md §3.2).
 * @param {string} path Path below /api/v1, e.g. "/health"
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 */
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json', 'X-Requested-With': 'fetch' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'The server could not be reached.',
    });
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError({
      status: response.status,
      code: error?.code ?? ERROR_CODES.INTERNAL_ERROR,
      message: error?.message ?? 'The request failed.',
      details: error?.details,
      requestId: error?.requestId ?? response.headers.get('X-Request-Id'),
    });
  }
  return payload;
}

async function readJson(response) {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
