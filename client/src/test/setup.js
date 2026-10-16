import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetBootstrapCache } from '../features/content/bootstrap.js';

/** jsdom has no matchMedia; tests opt into reduced motion with `mockMatchMedia({ reduce: true })`. */
export function mockMatchMedia({ reduce = false, hover = false } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: (query.includes('reduce') && reduce) || (query.includes('hover: hover') && hover),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  mockMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetBootstrapCache();
  document.getElementById('bitbyte-bootstrap')?.remove();
  document.documentElement.className = '';
  document.documentElement.style.overflow = '';
});
