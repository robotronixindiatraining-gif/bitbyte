import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from '../src/content/sanitize.js';

describe('rich-text sanitising (server-side, after validation)', () => {
  it('keeps the allowed formatting and safe links', () => {
    expect(
      sanitizeRichText(
        '<h2>Title</h2><p><strong>Bold</strong> <a href="https://example.com">link</a></p>',
      ),
    ).toBe(
      '<h2>Title</h2><p><strong>Bold</strong> <a href="https://example.com" rel="noopener noreferrer">link</a></p>',
    );
    expect(sanitizeRichText('<a href="mailto:hi@example.com">mail</a>')).toContain(
      'href="mailto:hi@example.com"',
    );
  });

  it('removes scripts, event handlers, styles, embeds and unsafe URLs', () => {
    const dirty =
      '<p style="color:red" onclick="steal()" class="x">Hi</p><script>alert(1)</script><img src=x onerror=alert(1)>' +
      '<iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">a</a><a href="//evil.example">b</a>' +
      '<svg><g onload="x()"></g></svg><a href="data:text/html;base64,PHNjcmlwdD4=">c</a>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(
      /script|onclick|onerror|style=|class=|iframe|javascript:|svg|data:|evil/,
    );
    expect(clean).toContain('<p>Hi</p>');
  });
});
