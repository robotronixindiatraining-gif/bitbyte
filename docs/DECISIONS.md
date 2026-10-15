# Decision Log

Architecture and project decisions, with rationale. **Status:** `Accepted` (confirmed by the owner) · `Proposed` (Stage 02 recommendation awaiting approval) · `Pending` (owner input required) · `Superseded`.
New decisions are appended; superseded ones stay, marked with a pointer to their replacement.

| ID | Decision | Status | Date |
|---|---|---|---|
| D-001 | MERN + Tailwind, JavaScript only, Node 22 LTS | Accepted (stack) / Proposed (Node version) | 2026-10-15 |
| D-002 | New build; no legacy app or DB migration | Accepted | 2026-10-15 |
| D-003 | `training.bitbyteindia.com` excluded | Accepted | 2026-10-15 |
| D-004 | Single `super_admin` role; multiple named accounts | Accepted (role) / Proposed (multiple accounts) | 2026-10-15 |
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
| D-018 | Media storage provider | **Pending** | — |
| D-019 | E-mail (SMTP) provider and notification recipients | **Pending** | — |
| D-020 | Spam protection; optional Turnstile | Proposed (base) / **Pending** (Turnstile) | 2026-10-15 |
| D-021 | Hosting and database hosting | **Pending** | — |
| D-022 | Error tracking service | **Pending** | — |
| D-023 | Typefaces | Proposed | 2026-10-15 |
| D-024 | Provisional palette; logo-derivation procedure | Proposed | 2026-10-15 |
| D-025 | Listing order applies immediately | Proposed | 2026-10-15 |
| D-026 | Two-factor authentication for super admins | **Pending** (recommended) | — |
| D-027 | Password recovery without e-mail reset | Proposed | 2026-10-15 |
| D-028 | Canonical host (`www`) | **Pending** | — |
| D-029 | Light-first design with dark surfaces; no site-wide dark mode at launch | Proposed | 2026-10-15 |
| D-030 | Custom pages at top-level slugs with a reserved list | Proposed | 2026-10-15 |
| D-031 | Career applications without CV upload | **Pending** | — |
| D-032 | Lead data retention period | **Pending** | — |
| D-033 | Analytics provider and consent | **Pending** | — |
| D-034 | Fixed templates for service/project/job detail pages | Proposed | 2026-10-15 |
| D-035 | Testing stack | Proposed | 2026-10-15 |
| D-036 | Stage 03 dependency plan | Proposed | 2026-10-15 |

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

### D-018 Media storage provider (Pending)
Options: Cloudinary (CDN + transforms, free tier), S3-compatible (AWS S3 / Cloudflare R2), or local disk on a VPS with backups. **Recommendation:** Cloudinary or R2 + CDN. Owner input needed: budget and account ownership.

### D-019 E-mail (Pending)
An SMTP/transactional provider for lead notifications, using a domain mailbox with SPF, DKIM and DMARC. Also needed: the notification recipients. Leads are stored even if e-mail fails.

### D-020 Spam protection
**Proposed baseline:** honeypot field + minimum fill time + rate limits; suspicious submissions are kept as `spam`. **Pending:** whether to enable Cloudflare Turnstile (the old site had a CAPTCHA, inventory P13a; Turnstile is a third-party script and needs an account).

### D-021 Hosting (Pending)
Single Node process behind TLS (VPS + Nginx + PM2, or a managed Node platform), and MongoDB Atlas (Mumbai recommended). Depends on budget and who maintains the host.

### D-022 Error tracking (Pending)
Optional (e.g. Sentry). Without it: structured logs + uptime check.

### D-023 Typefaces
Plus Jakarta Sans Variable (headings), Inter Variable (body/UI), JetBrains Mono (accents). Self-hosted open-licence fonts. Revisit if the logo uses a specific licensed brand typeface.

### D-024 Provisional palette
A navy/neutral/electric-blue palette with computed contrast (`DESIGN_SYSTEM.md` §2), **explicitly provisional**. Final values will come from the vector logo using the documented procedure. Until a logo arrives, a **text wordmark** is shown; no substitute logo is invented.

### D-025 Listing order applies immediately
Reordering services, projects, testimonials and jobs changes the live order immediately, after a confirmation, and is audited. Content changes still go through draft/publish. **Rationale:** reordering isn't content; gating it behind per-item publishing would be cumbersome. (Section order *within a page* is part of the page draft and does need publishing.)

### D-026 Two-factor authentication (Pending; recommended)
TOTP for super-admin accounts with recovery codes. It adds a small dependency (`otpauth`) and a QR code at setup. **Recommended**, because a single all-powerful role is the highest-value target.

### D-027 Password recovery
No e-mail-based "forgot password" at launch (no SMTP decided, and it is an extra attack surface). Recovery is through another super admin or the server CLI. Revisit after D-019.

### D-028 Canonical host (Pending)
Proposed `https://www.bitbyteindia.com`. Both hosts are indexed (CG-27). Confirm with Search Console data.

### D-029 Light-first, with dark surfaces
The site uses light and muted sections, with dark navy hero, CTA and footer surfaces. **No visitor-toggled dark mode at launch** (doubles QA). Semantic tokens keep it possible later.

### D-030 Custom pages
The admin can create custom pages at `/<slug>`, excluding reserved slugs (`DATABASE_SCHEMA.md` §5).

### D-031 Career applications (Pending)
**Proposed:** jobs show "how to apply" instructions (e.g. e-mail). No CV upload at launch (it avoids storing personal documents). If the owner wants an application form, use the lead form (`type: career`) without file upload.

### D-032 Lead retention (Pending)
Owner sets a retention period (suggested 24 months). An automatic job removes or anonymises older leads. Required for DPDP Act 2023 compliance.

### D-033 Analytics (Pending)
Options: none, GA4 (needs consent handling), or a privacy-friendly alternative (e.g. Plausible). No third-party script is loaded until decided.

### D-034 Fixed templates for detail pages
Service, project and job detail pages use **fixed templates** driven by structured fields; only listing and marketing pages are section-based. **Rationale:** the indexed service pages share one structure (intro, offering lists, industries). Structured fields give consistent design, better SEO data and simpler editing.

### D-035 Testing stack
Vitest (shared/client/server unit), Supertest + mongodb-memory-server (API integration), Testing Library (components), Playwright + axe (e2e/a11y), Lighthouse CI (performance budgets).

### D-036 Stage 03 dependency plan
Installed from Stage 03 onward, per stage need. Versions are pinned via the lockfile.

| Workspace | Packages |
|---|---|
| client | react, react-dom, react-router, @tanstack/react-query, react-hook-form, @hookform/resolvers, tailwindcss, @tailwindcss/vite, lucide-react, @fontsource-variable/plus-jakarta-sans, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, clsx; admin-only lazy chunks: @tiptap/react, @tiptap/starter-kit (+ link/table extensions), @dnd-kit/core, @dnd-kit/sortable |
| server | express, mongoose, zod, helmet, express-rate-limit, cookie-parser, argon2, multer, file-type, sharp, sanitize-html, pino, pino-http; later per decision: nodemailer (D-019), storage SDK (D-018), otpauth (D-026) |
| shared | zod |
| dev | vite, @vitejs/plugin-react, eslint (+ react-hooks, jsx-a11y plugins), prettier, vitest, @testing-library/react, jsdom, supertest, mongodb-memory-server, @playwright/test, @axe-core/playwright, concurrently, nodemon |

**Changes from the Stage 00 report:** `motion` dropped (D-017). `cors`, `jsonwebtoken`, `express-mongo-sanitize` and `csrf-csrf` remain excluded.

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
