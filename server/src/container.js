import { createMediaStorage } from './media/storage.js';
import { createAdminService } from './services/adminService.js';
import { createAuditService } from './services/auditService.js';
import { createAuthService } from './services/authService.js';
import { createContentService } from './services/contentService.js';
import { createDashboardService } from './services/dashboardService.js';
import { createLeadNotifications } from './services/leadNotifications.js';
import { createLeadService } from './services/leadService.js';
import { createMailer } from './services/mailer.js';
import { createMediaService } from './services/mediaService.js';
import { createPreviewService } from './services/previewService.js';
import { createPublicCache, createPublicContentService } from './services/publicContentService.js';
import { createRedirectService } from './services/redirectService.js';
import { createRetentionService } from './services/retentionService.js';
import { createSecurityNotifications } from './services/securityNotifications.js';
import { createSessionService } from './services/sessionService.js';
import { createTaxonomyService } from './services/taxonomyService.js';
import { createTurnstileVerifier } from './services/turnstile.js';

/** Hostnames a Turnstile token may be issued for: configured, else the public site's host. */
function turnstileHostnames(config) {
  if (config.turnstile.allowedHostnames.length > 0) return config.turnstile.allowedHostnames;
  return config.publicSiteUrl ? [new URL(config.publicSiteUrl).hostname] : [];
}

/**
 * Wire services once per app (or CLI run). Overrides let tests inject doubles for every
 * external provider (mail, media storage, Turnstile, fetch) so tests never call real services.
 */
export function createServices({ config, logger, overrides = {} }) {
  const fetchImpl = overrides.fetch ?? fetch;
  const mailer =
    overrides.mailer ??
    createMailer({
      driver: config.mail.driver,
      resendApiKey: config.mail.resendApiKey,
      from: config.mail.from,
      logger,
      fetchImpl,
    });
  const audit = overrides.audit ?? createAuditService({ logger });
  const notifications = createSecurityNotifications({ mailer, logger });
  const sessions = createSessionService({ config });
  const auth = createAuthService({ config, sessions, audit, notifications });
  const { context } = auth;
  const admins = createAdminService({ audit, sessions, notifications, context });

  const storage =
    overrides.mediaStorage ??
    createMediaStorage({ ...config.media, env: config.env, client: overrides.cloudinaryClient });
  const media = createMediaService({ storage, audit, context, logger });
  const cache = createPublicCache();
  const retention = createRetentionService({ audit, logger });

  const content = createContentService({
    audit,
    context,
    hooks: {
      async onPublished(kind, doc) {
        cache.clear();
        // New retention periods apply to every stored lead (D-032).
        if (kind === 'settings' && doc.key === 'privacy') {
          // Already published and audited: a failure here must not become an error response.
          // The daily retention job recomputes expiry dates again before purging.
          await retention.recomputeExpiry(doc.published).catch((err) => {
            logger.error({ err: { name: err?.name } }, 'lead expiry recomputation failed');
          });
        }
      },
    },
  });
  const taxonomies = createTaxonomyService({ audit, context, content });
  const redirects = createRedirectService({ audit, context });
  const siteUrl = config.publicSiteUrl;
  const publicContent = createPublicContentService({ media, siteUrl, cache });
  const preview = createPreviewService({ media, siteUrl });
  const dashboard = createDashboardService();

  const turnstile =
    overrides.turnstile ??
    createTurnstileVerifier({
      secretKey: config.turnstile.secretKey,
      allowedHostnames: turnstileHostnames(config),
      strict: config.isProduction,
      fetchImpl,
    });
  const leadNotifications = createLeadNotifications({ mailer, config, logger });
  const leads = createLeadService({
    audit,
    context,
    turnstile,
    notifications: leadNotifications,
    logger,
  });

  return {
    mailer,
    audit,
    notifications,
    sessions,
    auth,
    admins,
    storage,
    media,
    cache,
    content,
    taxonomies,
    redirects,
    publicContent,
    preview,
    dashboard,
    turnstile,
    leadNotifications,
    leads,
    retention,
  };
}
