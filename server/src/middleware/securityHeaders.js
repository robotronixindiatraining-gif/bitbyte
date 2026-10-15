import helmet from 'helmet';

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const CLOUDINARY_ORIGIN = 'https://res.cloudinary.com';

/**
 * Security headers (docs/ARCHITECTURE.md §7.3). The CSP only allows first-party scripts plus
 * Cloudflare Turnstile (D-020); images may come from Cloudinary (D-018). No analytics (D-033).
 * @param {{ isProduction: boolean }} config
 */
export function securityHeaders(config) {
  const headers = helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", TURNSTILE_ORIGIN],
        'frame-src': [TURNSTILE_ORIGIN],
        'img-src': ["'self'", 'data:', CLOUDINARY_ORIGIN],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': config.isProduction ? [] : null,
      },
    },
    // includeSubDomains stays off: training.bitbyteindia.com is a separate property (D-003).
    strictTransportSecurity: config.isProduction ? { maxAge: 31_536_000 } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  return (req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    headers(req, res, next);
  };
}
