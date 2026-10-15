/** Escape text for HTML element content and double-quoted attributes. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON that is safe inside a <script> element (no "</script>", no HTML comment openers). */
export function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Plain-text excerpt of sanitised rich text (for descriptions and JSON-LD). */
export function plainText(html, max = 5000) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Inject per-route metadata into the built index.html (D-007): title, description, canonical,
 * robots, Open Graph/Twitter tags, JSON-LD and the bootstrap data the client reads on start-up.
 * Every value is escaped; nothing from the CMS is inserted as raw HTML.
 *
 * @param {string} template contents of client/dist/index.html
 * @param {{ title: string, description?: string | null, canonical?: string | null,
 *   robots?: string | null, ogImage?: { url: string, width?: number, height?: number, alt?: string } | null,
 *   ogType?: string, siteName?: string | null, jsonLd?: object[], verification?: string | null,
 *   bootstrap?: object | null }} meta
 */
export function renderShell(template, meta) {
  const tags = [];
  const add = (tag) => tags.push(`    ${tag}`);
  if (meta.description)
    add(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  if (meta.robots) add(`<meta name="robots" content="${escapeHtml(meta.robots)}" />`);
  if (meta.canonical) add(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  if (meta.verification)
    add(`<meta name="google-site-verification" content="${escapeHtml(meta.verification)}" />`);
  add(`<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  add(`<meta property="og:type" content="${escapeHtml(meta.ogType ?? 'website')}" />`);
  if (meta.siteName) add(`<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`);
  if (meta.canonical) add(`<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  if (meta.description)
    add(`<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  if (meta.ogImage?.url) {
    add(`<meta property="og:image" content="${escapeHtml(meta.ogImage.url)}" />`);
    if (meta.ogImage.width)
      add(`<meta property="og:image:width" content="${meta.ogImage.width}" />`);
    if (meta.ogImage.height)
      add(`<meta property="og:image:height" content="${meta.ogImage.height}" />`);
    if (meta.ogImage.alt)
      add(`<meta property="og:image:alt" content="${escapeHtml(meta.ogImage.alt)}" />`);
  }
  add(
    `<meta name="twitter:card" content="${meta.ogImage?.url ? 'summary_large_image' : 'summary'}" />`,
  );
  for (const item of meta.jsonLd ?? [])
    add(`<script type="application/ld+json">${safeJson(item)}</script>`);
  if (meta.bootstrap) {
    add(
      `<script id="bitbyte-bootstrap" type="application/json">${safeJson(meta.bootstrap)}</script>`,
    );
  }

  const title = `<title>${escapeHtml(meta.title)}</title>`;
  const withTitle = /<title>[\s\S]*?<\/title>/.test(template)
    ? template.replace(/<title>[\s\S]*?<\/title>/, () => title)
    : template.replace('</head>', () => `    ${title}\n  </head>`);
  return withTitle.replace('</head>', () => `${tags.join('\n')}\n  </head>`);
}
