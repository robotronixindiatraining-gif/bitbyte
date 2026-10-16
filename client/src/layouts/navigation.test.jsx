import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FIXTURE_HOME_PAGE, FIXTURE_SERVICES, FIXTURE_SITE } from '../dev/fixtures.js';
import { mockMatchMedia } from '../test/setup.js';
import { renderApp, stubApi } from '../test/renderApp.jsx';
import { buildNavigation } from './navigation.js';

const PUBLISHED = {
  '/api/v1/public/site': FIXTURE_SITE,
  '/api/v1/public/services': FIXTURE_SERVICES,
  '/api/v1/public/pages/home': FIXTURE_HOME_PAGE,
};

async function renderHome() {
  stubApi(PUBLISHED);
  renderApp('/');
  await screen.findByRole('heading', { level: 1 });
}

describe('desktop mega-menu', () => {
  it('opens with the keyboard, moves with arrows and closes on Escape with focus returned', async () => {
    const user = userEvent.setup();
    await renderHome();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    const button = within(nav).getByRole('button', { name: 'Services' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    button.focus();
    await user.keyboard('{ArrowDown}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    expect(panel).toBeVisible();
    // Summaries come from the published services list.
    expect(within(panel).getByText(FIXTURE_SERVICES[1].summary)).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toHaveTextContent('Web Development');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveTextContent('Internet of Things');
    await user.keyboard('{End}');
    expect(document.activeElement).toHaveTextContent('All services');
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    await renderHome();
    const button = within(screen.getAllByRole('navigation', { name: 'Main' })[0]).getByRole(
      'button',
      { name: 'Services' },
    );
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('mobile drawer', () => {
  it('opens as a dialog, locks scrolling and closes with the close button, returning focus', async () => {
    const user = userEvent.setup();
    await renderHome();
    const menu = screen.getByRole('button', { name: 'Menu' });
    await user.click(menu);
    const dialog = document.getElementById('mobile-menu');
    expect(dialog.open).toBe(true);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(document.documentElement.style.overflow).toBe('hidden');
    await user.click(within(dialog).getByRole('button', { name: 'Close menu' }));
    expect(dialog.open).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement).toBe(menu);
  });

  it('offers call, e-mail and WhatsApp quick actions only from published contact details', async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const dialog = document.getElementById('mobile-menu');
    expect(within(dialog).getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:+910000000000',
    );
    expect(within(dialog).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/910000000000',
    );
  });
});

describe('navigation data', () => {
  it('uses only published navigation and drops incomplete links', () => {
    const nav = buildNavigation(
      {
        header: [
          {
            label: 'Services',
            href: '/services',
            children: [
              { label: 'IoT', href: '/internet-of-things' },
              { label: '', href: '/x' },
            ],
          },
          { label: 'Broken', href: null },
        ],
        cta: null,
      },
      FIXTURE_SERVICES,
    );
    expect(nav.header).toHaveLength(1);
    expect(nav.header[0].children).toEqual([
      expect.objectContaining({ label: 'IoT', icon: 'cpu' }),
    ]);
    expect(buildNavigation(null, [])).toEqual({ header: [], cta: null });
  });
});

describe('reduced motion', () => {
  it('never hides content for reveal animations when reduced motion is requested', async () => {
    mockMatchMedia({ reduce: true });
    const { initMotion } = await import('../components/ui/motion.js');
    initMotion();
    expect(document.documentElement.classList.contains('motion-ok')).toBe(false);
    await renderHome();
    for (const element of document.querySelectorAll('[data-reveal]')) {
      expect(element).toHaveAttribute('data-revealed');
    }
  });
});
