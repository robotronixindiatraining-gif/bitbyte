import { createAdminService } from './services/adminService.js';
import { createAuditService } from './services/auditService.js';
import { createAuthService } from './services/authService.js';
import { createContentService } from './services/contentService.js';
import { createMailer } from './services/mailer.js';
import { createPublicContentService } from './services/publicContentService.js';
import { createSecurityNotifications } from './services/securityNotifications.js';
import { createSessionService } from './services/sessionService.js';

/** Wire services once per app (or CLI run). Overrides let tests inject doubles. */
export function createServices({ config, logger, overrides = {} }) {
  const mailer = overrides.mailer ?? createMailer({ driver: config.mailDriver, logger });
  const audit = overrides.audit ?? createAuditService({ logger });
  const notifications = createSecurityNotifications({ mailer, logger });
  const sessions = createSessionService({ config });
  const auth = createAuthService({ config, sessions, audit, notifications });
  const admins = createAdminService({ audit, sessions, notifications, context: auth.context });
  const content = createContentService({ audit, context: auth.context });
  const publicContent = createPublicContentService();
  return { mailer, audit, notifications, sessions, auth, admins, content, publicContent };
}
