# Decision Log

Architecture and project decisions, with rationale. **Status:** `Accepted` (confirmed by the owner) · `Proposed` (Stage 02 recommendation awaiting approval) · `Pending` (owner input required) · `Implemented … awaiting review` (implementation decisions made within an approved stage scope) · `Superseded`.
New decisions are appended; superseded ones stay, marked with a pointer to their replacement.

| ID | Decision | Status | Date |
|---|---|---|---|
| D-001 | MERN + Tailwind, JavaScript only, Node 22 LTS | Accepted (stack) / Proposed (Node version) | 2026-10-15 |
| D-002 | New build; no legacy app or DB migration | Accepted | 2026-10-15 |
| D-003 | `training.bitbyteindia.com` excluded | Accepted | 2026-10-15 |
| D-004 | Single `super_admin` role; multiple named accounts with identical rights | Accepted | 2026-10-15 |
| D-005 | npm-workspaces monorepo | Proposed | 2026-10-15 |
| D-006 | Single origin, single deployable service | Proposed | 2026-10-15 |
| D-007 | SPA + server-side meta injection + bootstrap data | Proposed | 2026-10-15 |
| D-008 | Hybrid content model with an approved section registry | Proposed | 2026-10-15 |
| D-009 | Dual-state draft/published documents + revisions | Proposed | 2026-10-15 |
| D-010 | Optimistic concurrency via `revision` | Proposed | 2026-10-15 |
| D-011 | Opaque server-side sessions + argon2id | Proposed | 2026-10-15 |
| D-012 | CSRF defence without tokens | Proposed | 2026-10-15 |
| D-013 | Media: object storage + metadata collection, ID references | Proposed | 2026-10-15 |
| D-014 | Rich text: TipTap editor, sanitised HTML storage | Proposed | 2026-10-15 |
| D-015 | `[CONFIRM …]` placeholders block publishing | Proposed | 2026-10-15 |
| D-016 | Collection evaluation (pricing, careers, blog, taxonomies) | Proposed | 2026-10-15 |
| D-017 | No animation library at launch | Proposed | 2026-10-15 |
| D-018 | Media storage: Cloudinary (signed server-side uploads) | Accepted (owner to confirm account/plan) | 2026-10-15 |
| D-019 | E-mail notifications: Resend behind a replaceable mail adapter | Accepted (evaluate before production) | 2026-10-15 |
| D-020 | Spam protection: Cloudflare Turnstile verified server-side + honeypot + rate limits | Accepted | 2026-10-15 |
| D-021 | Hosting: one domain, one Node service, managed MongoDB | Accepted (architecture) / provider not provisioned | 2026-10-15 |
| D-022 | Structured logging + request correlation; external error tracking optional | Accepted | 2026-10-15 |
| D-023 | Typefaces | Proposed | 2026-10-15 |
| D-024 | Provisional palette; logo-derivation procedure | Proposed | 2026-10-15 |
| D-025 | Listing order applies immediately | **Superseded** by D-037 | 2026-10-15 |
| D-026 | Mandatory TOTP two-factor authentication with recovery codes | Accepted | 2026-10-15 |
| D-027 | Password recovery without e-mail reset links | Accepted (rules in D-039) | 2026-10-15 |
| D-028 | Canonical host `https://www.bitbyteindia.com` (provisional; verify DNS first) | Accepted (provisional) | 2026-10-15 |
| D-029 | Light-first design with dark surfaces; no site-wide dark mode at launch | Proposed | 2026-10-15 |
| D-030 | Custom pages at top-level slugs with a reserved list | Proposed | 2026-10-15 |
| D-031 | Configurable career application workflow | Accepted | 2026-10-15 |
| D-032 | Configurable lead retention (default 365 days) and secure deletion | Accepted | 2026-10-15 |
| D-033 | Third-party analytics deferred | **Deferred** | 2026-10-15 |
| D-034 | Fixed templates for service/project/job detail pages | Proposed | 2026-10-15 |
| D-035 | Testing stack | Proposed | 2026-10-15 |
| D-036 | Dependency plan (updated in Stage 03) | Accepted | 2026-10-15 |
| D-037 | Ordering is drafted, previewed and published (`orderings` collection) | Accepted | 2026-10-15 |
| D-038 | Preserve legacy top-level URLs (service pages at `/<slug>`) | Accepted | 2026-10-15 |
| D-039 | Two-factor and account-recovery security rules | Accepted | 2026-10-15 |
| D-040 | Stage 03 tooling choices | Accepted (implemented) | 2026-10-15 |
| D-041 | Health endpoints: liveness and readiness | Accepted (implemented) | 2026-10-15 |
| D-042 | Query-injection defence: `sanitizeFilter` + `mongoose.trusted()`; fail fast when the DB is down | Accepted (implemented) | 2026-10-15 |
| D-043 | Locked accounts answer with the generic 401, not 429 | Accepted (implemented) | 2026-10-15 |
| D-044 | Enrolment before password change; password change needs a TOTP code | Accepted (implemented) | 2026-10-15 |
| D-045 | Fail-closed auditing of privileged actions | Accepted (implemented) | 2026-10-15 |
| D-046 | Seed: explicit identifiers, insert-only, no portfolio projects | Accepted (implemented) | 2026-10-15 |
| D-047 | Test database: `mongodb-memory-server` pinned to MongoDB 8.0.34 | Accepted (implemented) | 2026-10-15 |
| D-048 | Security notifications via the `log` mail driver until Stage 05 | Accepted (implemented) | 2026-10-15 |
| D-049 | Media pipeline rules (verify, re-encode, metadata only; no file replacement; production never uses local disk) | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-050 | Search indexing off unless production + `ROBOTS_ALLOW_INDEXING=true`; admin and API always noindex | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-051 | Contact form availability and Turnstile outcomes (503 until configured; outage → unverified lead) | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-052 | Lead notification e-mail is a notice without personal data; "accepted" ≠ delivered; retries | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-053 | Lead form fields stay provisional; server-side normalisation rules | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-054 | Public read cache cleared on every admin write (single instance) | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-055 | In-process scheduler for retention and notification retries; dry-run CLI | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-056 | Redirect rules: content wins; automatic slug-change redirects never chain | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-057 | Preview and HTML-shell semantics (drafts of non-archived items; real status codes) | Implemented in Stage 05; awaiting review | 2026-10-15 |
| D-058 | Step-up for publishing `privacy` and `leadForm` settings | Implemented in Stage 05; awaiting review | 2026-10-15 |

---

### D-001 Stack
**Decision:** MongoDB, Express 5, React 19, Node.js, Tailwind CSS v4, Vite. JavaScript (ESM) only. **No TypeScript files, configs or type packages**, enforced by a CI check. Node 22 LTS ≥ 22.22.0 (required by React Router 8) pinned in `.nvmrc` and `engines`.
**Rationale:** owner requirement, plus a mainstream, well-supported stack.

### D-002 No legacy migration · D-003 Training site excluded
Owner decisions (Stage 01 approval). They remove the legacy snapshot, DB backup/migration and the `trainingPrograms` collection from the Stage 00 plan.

### D-004 Single administrative role
**Decision:** exactly one role, `super_admin`, stored as an enum with a single value and enforced by router-level middleware. No public accounts. **Proposed:** allow several named super-admin accounts (same rights) so each person is individually accountable and a lost password can be reset by a colleague.
**Consequences:** no permission matrix to maintain. Because the role is all-powerful, controls on it are stronger (lockout, audit log, session limits, recommended 2FA D-026). Safeguards: you can't disable yourself, and the last active admin can't be disabled.
**Alternative rejected:** a shared single account (no accountability; a shared password).

### D-005 Monorepo with npm workspaces (`client`, `server`, `shared`, `e2e`)
**Rationale:** one lockfile and one CI run; `shared/` lets client and server use the same validation schemas. **Rejected:** separate repositories (version drift); Turborepo/Nx (unneeded for two apps).

### D-006 Single origin, single service
**Rationale:** first-party `SameSite=Strict` cookies, no CORS in production, simple hosting. **Rejected:** separate API domain; microservices; serverless split (no benefit at this scale).

### D-007 Rendering
**Decision:** client-rendered React app. Express injects per-route meta tags and JSON-LD and embeds bootstrap JSON for the first view; it returns real 404s for unknown slugs and generates `sitemap.xml`. Components are SSR-safe.
**Rationale:** correct link previews and indexable metadata without SSR complexity. Bootstrap data removes the first API round-trip.
**Rejected for now:** full SSR (React Router framework mode). It is the upgrade path if organic search requires it.

### D-008 Hybrid content model
**Decision:** dedicated collections for reusable entities, plus pages made of ordered, typed sections from a **developer-maintained registry** with strict schemas and limited variants. The admin edits content, order and visibility. Developers add new types.
**Rationale:** full content control without letting the layout drift away from the design system. **Rejected:** a free-form page builder (design quality, XSS surface); fully hardcoded pages (not manageable).

### D-009 Draft/published dual state + revisions
**Decision:** each publishable document holds `draft` and `published`. Publishing is one atomic single-document update, followed by a revision snapshot (keep 25) and an audit entry.
**Rationale:** live content can be edited safely with preview, and rollback is possible. It works on a standalone local MongoDB (no transactions required).
**Rejected:** a single `status` field (can't edit a live item privately); separate draft documents (complex reference handling).

### D-010 Optimistic concurrency
A `revision` integer is checked on every write; a mismatch returns 409 `EDIT_CONFLICT`. This prevents silent overwrites between tabs or admins.

### D-011 Sessions & passwords
**Decision:** an opaque 256-bit token in an HttpOnly, Secure, `SameSite=Strict` cookie, stored hashed in MongoDB with idle (2 h) and absolute (12 h) expiry. argon2id hashing.
**Rationale:** instant revocation (logout, password change, disable) and no token storage in JavaScript. **Rejected:** JWT access/refresh tokens (revocation complexity, no benefit on a single origin).
**Note:** rate-limit counters are in-memory for a single instance. If the app is scaled horizontally, move them to a shared store.

### D-012 CSRF
`SameSite=Strict` + Origin/Referer allowlist on non-GET requests + required `X-Requested-With` header + JSON-only bodies. **Rejected:** a CSRF token library (redundant for a same-origin JSON API).

### D-013 Media
Binaries go to object storage through an adapter (local disk in development). MongoDB stores metadata, variants and URLs. Content references media **by ID**. Derived `mediaRefs` indexes make "where used" and safe deletion cheap. Uploads are verified by magic bytes, re-encoded with sharp, and EXIF-stripped. **No SVG, GIF or HEIC uploads.**

### D-014 Rich text
TipTap in the admin (lazy-loaded) with a limited extension set (paragraphs, h2–h4, bold, italic, links, lists, blockquote, tables for legal pages only). Stored as HTML **sanitised server-side** with `sanitize-html` and an allowlist. **Rejected:** Markdown textarea (unfriendly for non-technical admins); storing unsanitised HTML.

### D-015 Placeholder guard
Seed data uses `[CONFIRM …]` tokens for unverified facts. Content containing them cannot be published, and the dashboard lists them. This puts the Stage 01 rule — never present unverified facts as verified — into code.

### D-016 Collection evaluation
- **Pricing:** no collection. An `engagementModels` section type instead, because no pricing exists on the source site (CG-18) and nothing needs reuse.
- **Careers:** a `jobOpenings` collection, since a "Current Opportunities" section exists and jobs need detail pages, expiry and JobPosting data.
- **Blog:** none (no evidence or owner).
- **Media:** a `media` collection is needed for alt text, variants and safe deletion.
- **Taxonomies:** one collection with a `type` field for categories and technologies.
- Each can be revisited without disrupting other collections.

### D-017 Motion without a library
CSS transitions, IntersectionObserver reveals and the native View Transitions API (progressive enhancement), with full reduced-motion support. **Supersedes** the conditional `motion` library in the Stage 00 report. Revisit only if a required interaction can't be achieved this way.

### D-018 Media storage: Cloudinary (Accepted)
- **Signed, server-side uploads only.** Credentials (`CLOUDINARY_URL`) live in server environment variables; there are no unsigned upload presets and no credentials in the client.
- **Pipeline:** magic-byte check → `sharp` normalisation (auto-orient, strip EXIF/GPS, cap the longest edge at 4096 px, re-encode) → upload to the folder `bitbyte/<environment>/` → store `publicId`, `version`, `format`, width, height and bytes in `media`. Normalising before upload keeps location metadata out of the stored original.
- **Delivery:** URLs are built with transformations (`f_auto,q_auto,c_limit,w_<n>`) from a **fixed width set** (480/768/1024/1440/1920). Variants are URLs, not stored files, and the fixed set bounds the number of derived assets.
- **Plan check (2026-10-15, Cloudinary billing documentation):** the Free plan has 25 monthly credits; 1 credit = 1,000 transformations *or* 1 GB storage *or* 1 GB bandwidth; transformations and bandwidth are measured over a rolling 30 days. That suits a company site with a few hundred images. Usage is monitored in the Cloudinary console, and the plan is re-verified before launch.
- **Owner action:** create the account under a company-owned login (not a personal one) and supply credentials at deployment.
- Local development uses the `local` driver behind the same storage-adapter interface, so the provider stays replaceable.

### D-019 E-mail notifications: Resend (Accepted, to be evaluated)
- A `mailer` adapter with `send({ to, subject, text, html, replyTo })` and two drivers: `log` (development/test: writes to the log, sends nothing) and `resend` (calls Resend's HTTP API with `fetch`, so no SDK dependency is needed). Changing provider means adding a driver.
- **Recipients:** `settings.leadForm.notificationEmails` (max 5, validated, **never exposed publicly**). Sender: `MAIL_FROM` on a domain verified in Resend (SPF/DKIM), with DMARC on the domain.
- The lead is saved **before** sending. Sending is retried (3 attempts with backoff) and its status is visible in the admin. A failure never blocks the visitor's response. All user-supplied text is escaped; `replyTo` is the lead's e-mail.
- **Limits (third-party sources, 2026; verify on Resend's pricing page):** free tier about 3,000 e-mails/month and 100/day. That is ample for notifications.
- **Evaluate before production:** domain verification on `bitbyteindia.com` DNS, inbox placement at the recipients' mail provider, and acceptability of the data handling. If unsuitable, swap the driver (SMTP, Postmark, SES).

### D-020 Spam protection: Cloudflare Turnstile (Accepted)
- **Every public form** (the lead form, and a career form if ever enabled) requires a Turnstile token. **The server verifies it** with `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` (secret from env, `remoteip`, and an `idempotency_key` for safe retries). It checks `success`, that `hostname` is an allowed host and that `action` matches the form. Tokens are single-use and expire after 300 s. Client-side widget state is never trusted.
- **Invalid or expired token** → `422 CAPTCHA_FAILED`: the widget resets and the visitor can retry.
- **Cloudflare unreachable** (network error or timeout from our server) → the lead is stored with `spamSignals.turnstile: 'unverified'` and shown in "Possible spam", so real enquiries are not lost. Rate limits still apply.
- **Defence in depth:** honeypot (silent `201`, stored as `spam`), minimum fill time and rate limits.
- **Development and test:** Cloudflare's documented test keys locally; automated tests mock `siteverify`. The CSP allows `challenges.cloudflare.com` for script and frame only.
- The widget script loads only on pages that contain a form.

### D-021 Hosting (Accepted architecture; nothing provisioned)
One public domain serves the website, admin and `/api/v1` from **one Node service**, with **managed MongoDB** (MongoDB Atlas). The proposed setup, options and checklist are in `DEPLOYMENT.md`. The provider and plan are chosen by the owner before Stage 10; no production resources are created before then.

### D-022 Logging & error handling first; error tracking optional (Accepted)
Structured JSON logs (pino) with redaction, a request ID on every log line and response (`X-Request-Id`), and safe error envelopes (no stack traces or internal messages in production). External error tracking (e.g. Sentry) stays **optional and off**: the error handler has a single integration point enabled only if `ERROR_TRACKING_DSN` is configured. No SDK is installed until it is wanted.

### D-023 Typefaces
Plus Jakarta Sans Variable (headings), Inter Variable (body/UI), JetBrains Mono (accents). Self-hosted open-licence fonts. Revisit if the logo uses a specific licensed brand typeface.

### D-024 Provisional palette
A navy/neutral/electric-blue palette with computed contrast (`DESIGN_SYSTEM.md` §2), **explicitly provisional**. Final values will come from the vector logo using the documented procedure. Until a logo arrives, a **text wordmark** is shown; no substitute logo is invented.

### D-025 Listing order applies immediately (**Superseded by D-037**)
~~Reordering changes the live order immediately.~~ The owner requires that ordering changes do not go live until published.

### D-026 Two-factor authentication (Accepted)
TOTP (RFC 6238: 6 digits, 30 s step, ±1 step tolerance) is **mandatory for every super-admin account**, with 10 single-use recovery codes. Dependencies: `otpauth` (TOTP) and `qrcode` (enrolment QR), installed in Stage 04. Security rules are in D-039.

### D-027 Password recovery (Accepted)
No e-mail-based "forgot password" links: they would be a second path into an all-powerful account. Recovery is done by another super admin or by the server CLI, under the rules in D-039.

### D-028 Canonical host (Accepted, provisional)
Preferred: `https://www.bitbyteindia.com`. Before any canonical redirect is enabled or DNS is touched, the current DNS records, TLS certificates and the host Search Console prefers must be verified (CG-27). Canonical-host redirects are **configuration-driven** (`CANONICAL_HOST`) and **disabled by default**; they are enabled in Stage 10 only after that verification. Nothing in this project changes DNS.

### D-029 Light-first, with dark surfaces
The site uses light and muted sections, with dark navy hero, CTA and footer surfaces. **No visitor-toggled dark mode at launch** (doubles QA). Semantic tokens keep it possible later.

### D-030 Custom pages
The admin can create custom pages at `/<slug>`, excluding reserved slugs (`DATABASE_SCHEMA.md` §5).

### D-031 Career applications: configurable (Accepted)
The super admin manages job openings in full. How candidates apply is a **setting** (`settings.careers.applicationMethod`):
- `instructions` (**default**): free-text "how to apply" per job.
- `email`: a `mailto:` button to a configured careers address.
- `external`: a link to an external application page.
- `form`: an on-site form. **Disabled (rejected by validation) until** the destination, handling and retention of applicant data are confirmed. If enabled later, it reuses the lead pipeline (`type: career`, Turnstile, its own retention period) with **no CV upload**.

### D-032 Lead retention & secure deletion (Accepted)
- **Configurable** `settings.privacy.leadRetentionDays`: **default 365**, allowed range 30–1095. It can't be empty or zero, so data is **never kept indefinitely by default**. Leads marked `spam` are kept for 30 days.
- A **daily purge job** hard-deletes expired leads and writes one audit entry with counts only (no personal data). The super admin can also **erase** a lead at any time (typed confirmation, audited without PII).
- **Backups:** deleted data remains only in database backups until those backups expire; backup retention is limited to ≤ 35 days (`DEPLOYMENT.md`). Notification e-mails already in recipients' mailboxes are outside the system; the privacy policy will say so.
- Logs never contain lead message bodies or contact details (redaction).

### D-033 Analytics (Deferred)
No analytics code, tags or third-party scripts ship until requirements and privacy implications are approved. The CSP blocks third-party scripts apart from Turnstile. Revisit with a privacy review (consent, DPDP Act).

### D-034 Fixed templates for detail pages
Service, project and job detail pages use **fixed templates** driven by structured fields; only listing and marketing pages are section-based. **Rationale:** the indexed service pages share one structure (intro, offering lists, industries). Structured fields give consistent design, better SEO data and simpler editing.

### D-035 Testing stack
Vitest (shared/client/server unit), Supertest + mongodb-memory-server (API integration), Testing Library (components), Playwright + axe (e2e/a11y), Lighthouse CI (performance budgets).

### D-036 Dependency plan (updated in Stage 03)
Installed from Stage 03 onward, per stage need. Versions are pinned via the lockfile. **Stage 03 changes:** e-mail goes through Resend's HTTP API (`fetch`), so **no `nodemailer`**. The storage SDK is `cloudinary`. TOTP uses `otpauth` + `qrcode`. `nodemon` and `dotenv` are replaced by Node built-ins (D-040). ESLint is pinned to 9.x and jsdom to 29.x (D-040). Packages actually installed are listed in `PROGRESS.md`.

| Workspace | Packages |
|---|---|
| client | react, react-dom, react-router, @tanstack/react-query, react-hook-form, @hookform/resolvers, tailwindcss, @tailwindcss/vite, lucide-react, @fontsource-variable/plus-jakarta-sans, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, clsx; admin-only lazy chunks: @tiptap/react, @tiptap/starter-kit (+ link/table extensions), @dnd-kit/core, @dnd-kit/sortable |
| server | express, mongoose, zod, helmet, express-rate-limit, cookie-parser, argon2, multer, file-type, sharp, sanitize-html, pino, pino-http; later per decision: nodemailer (D-019), storage SDK (D-018), otpauth (D-026) |
| shared | zod |
| dev | vite, @vitejs/plugin-react, eslint (+ react, react-hooks, jsx-a11y plugins), prettier, vitest, @testing-library/react, jsdom, supertest, pino-pretty, concurrently; later: mongodb-memory-server (04), @playwright/test + @axe-core/playwright (06) |

**Changes from the Stage 00 report:** `motion` dropped (D-017). `cors`, `jsonwebtoken`, `express-mongo-sanitize` and `csrf-csrf` remain excluded.

### D-037 Ordering is drafted, previewed and published (Accepted; supersedes D-025)
- A dedicated `orderings` collection holds one publishable document per list: `services`, `projects`, `testimonials`, `jobOpenings` and `projectCategories`. Each has `draft.ids` and `published.ids`.
- **Drag-and-drop** (`@dnd-kit/sortable` with keyboard sensors, plus accessible move up/down buttons) edits the draft order. **Preview** renders the draft order. **"Publish order"** makes it live.
- New items are appended to the draft order on creation. Published items missing from a list render after the listed ones, newest first.
- The `order` field on entity documents is removed.
- Section order within a page is part of the page draft; menu order is part of the `navigation` settings draft. Both also go live only on publish.

### D-038 Preserve legacy URLs; service pages at the top level (Accepted; supersedes the Stage 02 `/services/*` scheme)
- **Service detail pages live at `/<slug>`**, preserving the indexed `/cms-development`, `/internet-of-things` and `/digital-marketing`.
- For Web Development and Mobile App Development, the slugs must match the legacy URLs once verified. Provisional: `/web-development` and `/mobile-app-development` (`[CONFIRM]`).
- `/services` is a new overview page (no known legacy URL). `/`, `/portfolio`, `/contact` and `/careers` keep their paths. Portfolio and job detail pages are new (`/portfolio/<slug>`, `/careers/<slug>`).
- Pages (custom) and services share **one top-level slug namespace**: uniqueness is enforced across both collections plus the reserved list.
- **Redirects only when necessary:** trailing-slash/case normalisation, host/protocol canonicalisation (after D-028 verification), slug changes made in the CMS, and verified legacy URLs that can't be preserved.

### D-039 Two-factor & account-recovery security rules (Accepted)
1. **Mandatory enrolment.** A password-only sign-in of a not-yet-enrolled admin creates a *restricted* session that may only call enrolment, change-password and logout endpoints. Full access starts only after a verified TOTP code.
2. **No session from a password alone.** For enrolled admins, a correct password yields a 5-minute, single-use, hashed **login challenge** (max 5 code attempts). Only a valid TOTP or recovery code completes sign-in. 2FA failures count towards lockout.
3. **Secrets.** TOTP secrets are encrypted at rest (AES-256-GCM, key `TOTP_ENCRYPTION_KEY` from env) and never returned after enrolment. The last accepted time-step is stored to reject code replay.
4. **Recovery codes.** 10 high-entropy codes, shown once, stored as HMAC-SHA-256 hashes (server pepper), single-use. Each use is audited and the account owner is e-mailed. Regenerating them requires step-up.
5. **Step-up re-authentication** (password + current TOTP within the last 5 minutes) is required for: changing your password, regenerating recovery codes, creating, disabling or deleting admins, resetting another admin's password or 2FA, exporting and erasing leads, and changing lead-retention settings.
6. **Admin-assisted 2FA reset** (lost device *and* codes): another super admin, after step-up, clears the target's 2FA. All the target's sessions are revoked, the password is unchanged and re-enrolment is forced at next sign-in. An admin can't reset their own 2FA this way.
7. **Password and 2FA are never reset by one action.** Resetting both for an account takes two separately audited actions, each with step-up.
8. **Every reset is audited and notified:** the affected admin and all other active admins are e-mailed; the dashboard shows a security alert for 7 days.
9. **CLI recovery** (`admin:reset-password`, `admin:reset-2fa`) requires shell access to the server. It is audited as `system`, prints only a one-time temporary password and forces a password change and re-enrolment. It is the only path when the last admin is locked out.
10. **No e-mail reset links** (D-027). The temporary passwords issued above must be changed at first use.

### D-040 Stage 03 tooling choices (Accepted, implemented)
| Choice | Reason |
|---|---|
| **ESLint 9.39** (flat config), not 10 | `eslint-plugin-react` and `eslint-plugin-jsx-a11y` declare peer support only up to ESLint 9 |
| **jsdom 29**, not 30 | jsdom 30 requires Node ≥ 22.22.2; the project minimum (and this environment) is 22.22.0 |
| `node --watch` and `process.loadEnvFile()` instead of `nodemon`/`dotenv` | Built into Node 22; two fewer dependencies. The `--env-file-if-exists` flag was tried first, but combined with `--watch` it crashes when `server/.env` is missing (Node 22.22 tries to watch the absent file), so the server loads `server/.env` itself only when it exists. Real environment variables take precedence. |
| `"sideEffects": false` on `@bitbyte/shared` | Lets the client bundle drop unused shared modules (zod). The initial build was 129.5 KB gzip and over the 120 KB budget; after the change it is 110.4 KB |
| `pino-pretty` as a dev dependency only | Readable local logs; production logs stay JSON |
| Playwright + axe workspace deferred to Stage 06; `mongodb-memory-server` deferred to Stage 04 | Nothing to exercise yet: no UI beyond the shell, no models |
| Prettier ignores Markdown | Keeps the hand-written documentation tables intact |
| React Router + TanStack Query installed now | Establishes the routing and data-fetching conventions in the shell |

### D-041 Health endpoints (Accepted, implemented)
- `GET /api/v1/health` is **liveness**: 200 whenever the process serves requests, and reports the database state (`up`, `connecting`, `down`, `disabled`).
- `GET /api/v1/health/ready` is **readiness**: 200 only when the database is connected, otherwise 503.
- The server starts without a database and keeps retrying the connection in the background, so the process can start and report its state. Hosting health checks use liveness for restarts and readiness for routing traffic. This supersedes the Stage 02 note that `/health` returns 503.


### D-042 Query-injection defence (Stage 04)
Global `sanitizeFilter` turns operators in untrusted filter values (e.g. `{ "$ne": null }`) into literals, so such queries are rejected instead of matching. Server code marks its own operator objects with `mongoose.trusted()`. This sits behind strict zod validation, which already rejects non-string credentials (422). `bufferCommands: false` makes queries fail immediately when MongoDB is unreachable; the error handler maps those failures to `503 SERVICE_UNAVAILABLE` (verified by the smoke test).

### D-043 Lockout response (refines API_REFERENCE §1.2)
A locked or disabled account answers exactly like a wrong password (`401 INVALID_CREDENTIALS`), with the same argon2 work. Answering `429` for lockout would reveal that the e-mail belongs to an account. `429` is used only by the request-rate limiters.

### D-044 Order of first sign-in (refines D-039)
A new admin first **enrols 2FA** (restricted `enrollment` session), and only then changes the temporary password. `change-password` always requires the current password **and** a current TOTP code (inline re-authentication), so it never needs a password-only session. Confirming enrolment ends all of the admin's sessions and issues one new session. Re-enrolling from an active session requires step-up.

### D-045 Fail-closed auditing
Privileged actions (admin create/update/delete, password and 2FA resets, session revocation, 2FA enrolment, password change, recovery-code regeneration, publish/unpublish) write an `attempted` audit entry **before** acting. If that write fails, the action is refused with 503. The entry is then completed as `succeeded`/`failed`. If completion itself fails, it stays `attempted` and the failure is logged, so the log never claims a success it did not record. A successful sign-in is audited before the session is issued (no audit → no session). Failed sign-ins are recorded best-effort (the response is 401 either way). Audit metadata is reduced to primitives, and keys that look like secrets are dropped.

### D-046 Seed design (refines DATABASE_SCHEMA §8)
Explicit identifiers (`seedKey`, or the unique settings/ordering `key`). Documents are **inserted only when absent**: no updates, no upserts that modify, and a unique-index conflict leaves the existing document untouched. Seeded drafts contain `[CONFIRM …]` placeholders, so nothing seeded can be published unverified. **Portfolio project names are not seeded** (unlike the Stage 02 plan): creating them, even as drafts, could read as portfolio claims; they stay in `CONTENT_INVENTORY.md` until verified. Administrator accounts are never read or written by the seed. A deleted seeded document is re-created as a draft on the next run (documented behaviour).

### D-047 Test database
Server integration tests use `mongodb-memory-server` (a real `mongod` in a temporary directory per test file), pinned to **MongoDB 8.0.34** via `MONGOMS_VERSION`. CI downloads the binary. Where downloads are blocked (as in the build environment), `MONGOMS_SYSTEM_BINARY` points at a local `mongod`; there it was extracted from the official `mongo:8.0` Docker image. Tests never use a development or production database. For local development, a MongoDB 8.0 container (`docker run -d -p 27017:27017 mongo:8.0`) is the documented option.

### D-048 Notification e-mails in Stage 04
Security notifications (resets, recovery-code use, password changes) go through the mail adapter's `log` driver: recorded as "would send" with the subject and recipient count only. The Resend driver (D-019) replaces it in Stage 05 without code changes in the callers.


### D-049 Media pipeline rules (Stage 05; refines D-013, D-018)
- **Verification:** the file type comes from the magic bytes (`file-type`) and must be confirmed by the decoder (`sharp`); the browser's MIME type and file name are ignored. Allowed: JPEG, PNG, WebP, AVIF. SVG, GIF and HEIC are refused (415). Uploads are limited to 10 MB, 12 000 px per side and **40 megapixels** (lowered from the Stage 02 "12 000 × 12 000" because decoding 144 MP needs over 500 MB of memory on a small server).
- **Normalisation:** auto-rotate, scale to ≤ 4096 px on the longest edge, re-encode in the same format. Re-encoding drops EXIF/GPS and anything appended to the file. The original file is never stored.
- **Storage:** binaries go to the storage driver; MongoDB holds metadata only. `local` (development/tests, files named `<uuid>.<ext>`, served at `/uploads`) or `cloudinary` (signed server-side `upload_stream` to `bitbyte/<env>/<uuid>`, `overwrite: false`; delivery variants `f_auto,q_auto,c_limit,w_<480…2400>`). Production refuses `local`; production without `MEDIA_DRIVER=cloudinary` runs with uploads **disabled** (503) instead of failing to boot, so the site can be deployed before Cloudinary credentials exist.
- **Consistency:** upload = verify → audit (fail-closed) → store → insert metadata; if the insert fails, the stored file is deleted again (an orphan is only possible if that deletion also fails, and is then logged by its random key). Delete = refuse while referenced (draft or published) → provider delete (idempotent; "not found" counts as deleted) → metadata delete. A provider failure leaves everything unchanged (503); retrying a half-finished delete completes it.
- **Duplicates:** the SHA-256 of the original upload identifies repeats (`200` + `duplicateOf`).
- **No "replace file" endpoint:** replacing an image means uploading a new one and switching references, which keeps published pages and revisions pointing at the exact file they were published with.

### D-050 Search-engine indexing (Stage 05)
`robots.txt` allows crawling **only** when `NODE_ENV=production` **and** `ROBOTS_ALLOW_INDEXING=true` (then `Disallow: /admin`, `Disallow: /api` and the sitemap). Otherwise it answers `Disallow: /`, and HTML pages carry `noindex, nofollow` plus `X-Robots-Tag: noindex`. This keeps development, staging and the production deployment before launch out of search results; switching it on is a launch-checklist step (`DEPLOYMENT.md` §8). `/admin/*` pages and every `/api` response are always `noindex`. The canonical-host redirect stays disabled (`CANONICAL_HOST` unset) until the domain is verified (D-028).

### D-051 Contact form availability and Turnstile outcomes (Stage 05; refines D-020)
- The form answers **503** until the `leadForm` settings are published **and** `TURNSTILE_SECRET_KEY` is configured: accepting submissions without bot protection, or without the published consent text, is not allowed.
- Failed, missing, expired or replayed tokens → `422 CAPTCHA_FAILED`; nothing is stored. Tokens are remembered locally for 10 minutes so a replay fails even before Cloudflare is asked; each verification sends a fresh `idempotency_key` (the new lead's id).
- Cloudflare unreachable (network, 5xx, `internal-error`) → the lead is **stored** as `unverified` and flagged "Possible spam", so a genuine enquiry is not lost during an outage.
- Hostname and `action: "lead"` are enforced in production. Outside production they are checked only when Cloudflare returns them, because Cloudflare's documented test keys return placeholder values.
- Honeypot → `201` with the normal body and stored as spam (30-day retention); submissions faster than 3 s are flagged, not rejected.

### D-052 Lead notification e-mails (Stage 05; refines D-019)
- The notification is a **notice only**: reference id, time, a "possible spam" hint and the admin link. Names, contact details and messages stay in the database and are not copied to the mail provider.
- Status `accepted` means the provider (Resend) confirmed it **accepted** the message; it is not a delivery receipt, and the admin never claims more. The `log` driver (development and tests) sends nothing and records `not_sent`.
- Sending happens after the lead is stored and never affects the response. Temporary failures (network, 429, 5xx) are retried with back-off (1 min, 5 min, 30 min, 2 h, 6 h) by the scheduler; permanent failures (other 4xx) are marked `failed` and shown on the dashboard. Retries reuse an `Idempotency-Key`, and an atomic lease prevents two workers sending the same notice.
- Recipients: the published `leadForm.notificationEmails`, else `LEAD_NOTIFICATION_EMAILS`. Publishing `leadForm` requires step-up (D-058).

### D-053 Lead form fields (Stage 05)
The submission schema (`shared/src/leads.js`) mirrors the indexed contact form (inventory P13a) and is **provisional** until the original form is verified (CG-20). Server-side normalisation: trimmed text with collapsed whitespace, control characters rejected, e-mail lower-cased, CRLF → LF in messages, strict schema (unknown fields → 422), body ≤ 16 KB, `budget` restricted to the published options, `service` linked only if it is a published service.

### D-054 Public read cache (Stage 05)
Public reads are cached in memory (60 s TTL, ≤ 500 entries). Every admin write clears the cache before and after it runs, and every publish clears it again, so unpublishing or withdrawing consent takes effect immediately. This is correct for one server process; with several instances the TTL bounds staleness and a shared invalidation (e.g. a MongoDB change stream) would be needed (DEPLOYMENT.md §1 already assumes one instance).

### D-055 Scheduled jobs and retention runs (Stage 05; implements D-032)
An in-process scheduler (`server/src/jobs/scheduler.js`) runs the retention purge one minute after start and every 24 h, and notification retries every 5 minutes. Jobs never overlap, errors are logged, timers do not keep the process alive. It starts only from `server.js` when `JOBS_ENABLED` is not `false` (off in tests); with several instances it must run on one only. `npm run retention:run` performs the same purge manually and is a **dry run unless `--apply`** is given. Publishing new privacy settings recomputes every lead's `expiresAt`. The purge deletes in batches, only what has expired, and is safe to re-run; one audit entry records counts only.

### D-056 Redirect rules (Stage 05; refines D-038)
Content always wins: a manual redirect cannot be created for a path that a page, service, project or job uses, and a slug cannot be taken while a manual or legacy redirect uses it. Automatic `slug-change` redirects give way: publishing an item at an old address deletes the automatic redirect there. When an item moves, existing redirects to its old address are re-pointed to the new one, so chains never form. Redirect targets are site paths or `https://` URLs; reserved paths (`/`, `/api`, `/admin`, `/uploads`, `/assets`, `sitemap.xml`, `robots.txt`) cannot be redirected.

### D-057 Preview and HTML-shell semantics (Stage 05)
Preview shows drafts of every non-archived item (draft order, D-037), but still hides unconsented testimonials, projects without permission and closed jobs, because those could not be published either. The HTML shell answers with real status codes (200/301/302/404/503); when MongoDB is unavailable it serves the app shell with `503`, `Retry-After: 60` and `noindex` rather than an empty 200. All metadata comes from published CMS values; JSON-LD is emitted only from those values (Organization on the homepage, Service, JobPosting).

### D-058 Step-up for personal-data settings (Stage 05)
Publishing the `privacy` settings (retention periods) or the `leadForm` settings (notification recipients) requires a step-up within the last 5 minutes, like lead export and erasure. Editing their drafts does not.

---

### Superseded items from `STAGE_00_DISCOVERY_REPORT.md`
| Stage 00 item | Superseded by |
|---|---|
| §1.3 legacy snapshot, §5.4 DB backup/migration, Q2 | D-002 |
| `trainingPrograms`, training enquiries, Q3 | D-003 |
| §6.1 three-role matrix (super_admin/admin/editor), Q13 | D-004 |
| Conditional `motion` dependency | D-017 |
| `pricingPlans` collection | D-016 |
| `projectCategories` + `techTags` collections | D-016 (`taxonomies`) |
| `users` collection name | `admins` (`DATABASE_SCHEMA.md` §3.1) |
| Upload size cap 8 MB | 10 MB (`API_REFERENCE.md` §5.5) |

### Superseded items from the Stage 02 specification (Stage 02 refinements, 2026-10-15)
| Stage 02 item | Superseded by |
|---|---|
| Service pages at `/services/<slug>` with 301s from legacy paths | D-038 (top-level `/<slug>`, no redirects) |
| Immediate listing order (D-025), `order` field on entities | D-037 (`orderings` collection, publish to go live) |
| 2FA optional/pending | D-026, D-039 (mandatory) |
| Turnstile optional; Turnstile failure answered with a silent 201 | D-020 (required; invalid token → `422 CAPTCHA_FAILED`) |
| `nodemailer`/SMTP | D-019 (Resend via an adapter) |
| `/api/v1/health` returns 503 when the DB is down | D-041 (liveness + readiness) |
| Lead retention unset | D-032 (default 365 days) |
