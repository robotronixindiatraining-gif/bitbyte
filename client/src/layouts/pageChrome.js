import { createContext, useContext, useEffect } from 'react';

/**
 * Lets a page tell the layout that its first section is a dark hero, so the fixed header can
 * start transparent over it (§9.6). Pages without a dark hero get a solid header and top padding.
 */
export const PageChromeContext = createContext({ setOverlayHeader: () => {} });

export function useOverlayHeader(enabled) {
  const { setOverlayHeader } = useContext(PageChromeContext);
  useEffect(() => {
    setOverlayHeader(Boolean(enabled));
    return () => setOverlayHeader(false);
  }, [enabled, setOverlayHeader]);
}
