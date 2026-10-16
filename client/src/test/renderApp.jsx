import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AppRoutes } from '../app/routes.jsx';
import { jsonResponse } from './jsonResponse.js';

/**
 * Stub the API: `routes` maps an /api/v1 path to a JSON body, or to { status, body }.
 * Unlisted paths answer 404 like the real public API does for unpublished content.
 */
export function stubApi(routes = {}) {
  const fetchMock = vi.fn(async (input) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    const route = routes[path];
    if (route === undefined) {
      return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
    }
    if (route instanceof Error) throw route;
    if (route && typeof route === 'object' && 'status' in route && 'body' in route) {
      return jsonResponse(route.body, { status: route.status });
    }
    return jsonResponse({ data: route });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Insert server-style bootstrap data into the document. */
export function injectBootstrap(value) {
  const script = document.createElement('script');
  script.id = 'bitbyte-bootstrap';
  script.type = 'application/json';
  script.textContent = JSON.stringify(value);
  document.head.append(script);
}
