import { useEffect } from 'react';

/** Keeps <title> in step during client-side navigation (the server sets it on full loads). */
export function useDocumentTitle(title, template) {
  useEffect(() => {
    if (!title) return;
    document.title = template && template.includes('%s') ? template.replace('%s', title) : title;
  }, [title, template]);
}
