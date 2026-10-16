import { Link } from 'react-router';
import { linkKind } from './links.js';

/**
 * One link component for CMS and hard-coded links: client-side routing for site paths, a plain
 * anchor for http(s)/mailto/tel. Unsafe or malformed hrefs render as plain text, never as links.
 * New-tab links get rel="noopener noreferrer" and an announced "(opens in a new tab)".
 */
export function SmartLink({ href, openInNewTab = false, children, className, ...rest }) {
  const kind = linkKind(href);
  if (!kind) return <span className={className}>{children}</span>;
  const newTab = openInNewTab ? <span className="sr-only"> (opens in a new tab)</span> : null;
  // Fragment links ("#id", "/#id") stay native anchors so the browser scrolls to the target.
  if (kind === 'internal' && !href.includes('#') && !openInNewTab) {
    return (
      <Link to={href} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...(kind === 'external' && !openInNewTab ? { rel: 'noopener' } : {})}
      {...rest}
    >
      {children}
      {newTab}
    </a>
  );
}
