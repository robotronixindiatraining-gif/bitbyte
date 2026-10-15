import sanitizeHtml from 'sanitize-html';

/**
 * Rich-text allowlist (D-014). Everything else — scripts, styles, event handlers, iframes,
 * classes, data:/javascript: URLs — is removed. Links get rel="noopener noreferrer" and only
 * http(s)/mailto/tel schemes; external links may open in a new tab.
 */
const OPTIONS = Object.freeze({
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'], th: ['scope'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => {
      const attrs = { ...attribs };
      if (attrs.target && attrs.target !== '_blank') delete attrs.target;
      if (attrs.target === '_blank' || /^https?:/i.test(attrs.href ?? ''))
        attrs.rel = 'noopener noreferrer';
      return { tagName, attribs: attrs };
    },
  },
});

export function sanitizeRichText(html) {
  return sanitizeHtml(String(html ?? ''), OPTIONS).trim();
}
