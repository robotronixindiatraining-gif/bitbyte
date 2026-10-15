import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/jsonResponse.js';
import { ApiError, apiRequest } from './client.js';

describe('apiRequest', () => {
  it('calls the versioned API with JSON headers and returns the payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/things', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      data: { ok: true },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/things');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: '{"a":1}' });
    expect(init.headers).toMatchObject({
      'X-Requested-With': 'fetch',
      'Content-Type': 'application/json',
    });
  });

  it('normalises error envelopes into ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed.',
              details: [{ path: 'body.title', message: 'Required' }],
              requestId: 'req-12345678',
            },
          },
          { status: 422 },
        ),
      ),
    );

    const error = await apiRequest('/things').catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      requestId: 'req-12345678',
      details: [{ path: 'body.title', message: 'Required' }],
    });
  });

  it('handles non-JSON failures using the request id header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Bad gateway', {
          status: 502,
          headers: { 'X-Request-Id': 'edge-87654321' },
        }),
      ),
    );
    const error = await apiRequest('/things').catch((err) => err);
    expect(error).toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      requestId: 'edge-87654321',
    });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await apiRequest('/health').catch((err) => err);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
