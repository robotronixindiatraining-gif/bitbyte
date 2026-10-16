import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FIXTURE_HOME_PAGE, FIXTURE_SERVICES, FIXTURE_SITE } from '../dev/fixtures.js';
import { injectBootstrap, renderApp, stubApi } from '../test/renderApp.jsx';

const PUBLISHED = {
  '/api/v1/public/site': FIXTURE_SITE,
  '/api/v1/public/services': FIXTURE_SERVICES,
  '/api/v1/public/pages/home': FIXTURE_HOME_PAGE,
};

describe('public homepage', () => {
  it('renders the published homepage with header, sections and footer', async () => {
    stubApi(PUBLISHED);
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Software, web and IoT solutions/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    const services = screen.getByRole('region', { name: 'What we build' });
    expect(
      within(services)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(FIXTURE_SERVICES.map((s) => s.path));
    expect(screen.getAllByRole('link', { name: /Start a project/ }).length).toBeGreaterThan(0);
    expect(document.title).toBe('Home | BitByte (fixture)');
  });

  it('shows an intentional holding page (no placeholders) while the homepage is unpublished', async () => {
    stubApi({
      '/api/v1/public/site': {
        general: null,
        contact: null,
        navigation: null,
        footer: null,
        social: null,
        seo: null,
        leadForm: null,
        careers: null,
        integrations: { turnstileSiteKey: null },
      },
    });
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Our new website is being prepared' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\[CONFIRM/);
    // No navigation is invented when none is published; the wordmark falls back to text.
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'BitByte — home' })).toBeInTheDocument();
  });

  it('shows a friendly error with a working retry when the API fails', async () => {
    const fetchMock = stubApi({
      ...PUBLISHED,
      '/api/v1/public/pages/home': {
        status: 503,
        body: {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Database down: stack at /srv/app.js' },
        },
      },
    });
    renderApp('/');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This content could not be loaded');
    expect(document.body.textContent).not.toContain('stack at');
    stubApi(PUBLISHED);
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Software, web/ }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('renders a loading state before data arrives', () => {
    stubApi(PUBLISHED);
    renderApp('/');
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the server-injected page data for the first render without fetching the page', async () => {
    injectBootstrap({
      path: '/',
      kind: 'page',
      slug: 'home',
      data: FIXTURE_HOME_PAGE,
      site: FIXTURE_SITE,
    });
    const fetchMock = stubApi({ '/api/v1/public/services': FIXTURE_SERVICES });
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: /Software, web/ })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const fetched = fetchMock.mock.calls.map(([url]) => String(url));
    expect(fetched.some((url) => url.includes('/pages/home'))).toBe(false);
    expect(fetched.some((url) => url.includes('/public/site'))).toBe(false);
  });

  it('ignores bootstrap data rendered for a different path', async () => {
    injectBootstrap({
      path: '/about',
      kind: 'page',
      slug: 'about',
      data: { ...FIXTURE_HOME_PAGE, title: 'NOT HOME' },
      site: FIXTURE_SITE,
    });
    const fetchMock = stubApi(PUBLISHED);
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: /Software, web/ });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/pages/home'))).toBe(true);
  });

  it('renders the 404 page for unknown routes', async () => {
    stubApi(PUBLISHED);
    renderApp('/no-such-page');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
  });
});
