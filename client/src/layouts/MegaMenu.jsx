import { ArrowRight, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { BitGrid } from '../components/ui/BitGrid.jsx';
import { cx } from '../components/ui/cx.js';
import { IconTile } from '../components/ui/Icon.jsx';
import { isCurrentPath } from '../components/ui/links.js';
import { SmartLink } from '../components/ui/SmartLink.jsx';

const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 180;
const PANEL_PATTERN = ['00000000', '01000010', '00000000'];

/**
 * Desktop disclosure + mega-panel (§9.6). Opens on click (and after a short hover intent on
 * devices with a fine pointer); Arrow keys move between items; Escape closes and returns focus
 * to the button; clicking or tabbing outside closes it. It is a disclosure, not an ARIA menu,
 * so links keep their normal semantics for screen readers.
 */
export function MegaMenu({ item }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const timer = useRef(null);
  const { pathname } = useLocation();

  const links = () => [...(rootRef.current?.querySelectorAll('[data-menu-link]') ?? [])];
  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Close after navigation (state adjustment during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hoverCapable = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const schedule = (next, delay) => {
    if (!hoverCapable()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close(true);
      return;
    }
    const items = links();
    const index = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      if (event.target === buttonRef.current && event.key === 'ArrowRight') return;
      event.preventDefault();
      const target = (list) => list[index < 0 ? 0 : (index + 1) % list.length]?.focus();
      if (open) target(items);
      else {
        setOpen(true);
        // The panel renders on the next frame.
        requestAnimationFrame(() => target(links()));
      }
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && index >= 0) {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home' && index >= 0) {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End' && index >= 0) {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  };

  const active =
    item.children.some((child) => isCurrentPath(child.href, pathname)) ||
    isCurrentPath(item.href, pathname);

  return (
    // The container only coordinates keyboard and hover handling for its children.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={rootRef}
      className="static"
      onKeyDown={onKeyDown}
      onMouseEnter={() => schedule(true, HOVER_OPEN_MS)}
      onMouseLeave={() => schedule(false, HOVER_CLOSE_MS)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          clearTimeout(timer.current);
          setOpen((value) => !value);
        }}
        className={cx('nav-link inline-flex items-center gap-1.5', active && 'nav-link-active')}
      >
        {item.label}
        <ChevronDown
          aria-hidden="true"
          className={cx('size-4 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div
        id={`${id}-panel`}
        hidden={!open}
        className="surface-light absolute inset-x-0 top-full border-t border-border shadow-lg"
      >
        <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_16rem]">
          <ul className="grid gap-2 sm:grid-cols-2" role="list">
            {item.children.map((child, index) => (
              <li key={`${child.href}-${index}`}>
                <SmartLink
                  href={child.href}
                  openInNewTab={child.openInNewTab}
                  data-menu-link=""
                  aria-current={isCurrentPath(child.href, pathname) ? 'page' : undefined}
                  className="group flex gap-4 rounded-lg p-3 transition-colors duration-150 hover:bg-neutral-50 aria-[current=page]:bg-accent-100/60"
                >
                  {child.icon && <IconTile name={child.icon} />}
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold text-fg">{child.label}</span>
                    {child.summary && (
                      <span className="line-clamp-2 text-small text-fg-muted">{child.summary}</span>
                    )}
                  </span>
                </SmartLink>
              </li>
            ))}
          </ul>
          {item.href && (
            <div className="flex flex-col justify-between gap-6 rounded-lg bg-neutral-50 p-6">
              <BitGrid pattern={PANEL_PATTERN} cell={10} gap={5} />
              <SmartLink
                href={item.href}
                data-menu-link=""
                className="group inline-flex items-center gap-2 font-semibold text-link hover:text-link-hover"
              >
                All {item.label.toLowerCase()}
                <ArrowRight aria-hidden="true" className="group-hover-nudge size-4" />
              </SmartLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
