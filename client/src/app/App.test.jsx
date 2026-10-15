import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/jsonResponse.js';
import { createQueryClient } from './queryClient.js';
import { routes } from './routes.jsx';

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('application shell', () => {
  it('renders the foundation page and reports a healthy API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: { status: 'ok', db: 'up' } })),
    );
    renderAt('/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Website foundation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(await screen.findByText('API online · Database connected')).toBeInTheDocument();
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderAt('/');
    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', () => {
    vi.stubGlobal('fetch', vi.fn());
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
