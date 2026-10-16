/**
 * Scroll reveals (§6, D-017): one IntersectionObserver, CSS transitions, no library.
 * `motion-ok` is added to <html> only when IntersectionObserver exists and the visitor has not
 * asked for reduced motion; without it every element is simply visible.
 */
let observer = null;

export function motionAllowed() {
  if (typeof window === 'undefined') return false;
  if (typeof window.IntersectionObserver !== 'function') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function initMotion() {
  if (!motionAllowed()) return;
  document.documentElement.classList.add('motion-ok');
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (event) => {
    if (event.matches) document.documentElement.classList.remove('motion-ok');
  });
}

export function observeReveal(element) {
  if (!element) return () => {};
  if (!document.documentElement.classList.contains('motion-ok')) {
    element.setAttribute('data-revealed', '');
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-revealed', '');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
  );
  observer.observe(element);
  return () => observer?.unobserve(element);
}
