# Architecture

| | |
|---|---|
| **Status** | Stage 02 specification. Proposed, awaiting approval. Nothing is implemented yet. |
| **Related** | `DATABASE_SCHEMA.md`, `API_REFERENCE.md`, `DESIGN_SYSTEM.md`, `ADMIN_GUIDE.md`, `ROUTE_MAP.md`, `DECISIONS.md` |
| **Constraints** | MongoDB, Express, React, Node.js, Tailwind CSS. **JavaScript only, no TypeScript anywhere.** One administrative role (`super_admin`); public visitors are anonymous. |

---

## 1. Overview

**One application, one deployable service, one database.** This is a company website with a CMS, not a platform, so it needs no microservices, message queues, separate auth service or headless-CMS vendor.

```
                        ┌──────────────────────── Node.js process (Express 5) ────────────────────────┐
 Browser ── HTTPS ──▶   │  /api/v1/public/*   read-only, published content, cacheable                  │
 (visitor / admin)      │  /api/v1/auth/*     login, logout, session                                   │──▶ MongoDB
  │                     │  /api/v1/admin/*    super_admin only: drafts, publish, media, leads, settings │    (content, leads,
  │                     │  /sitemap.xml, /robots.txt   generated from published content                │     sessions, audit)
  │                     │  /*  (everything else) → React app shell with per-route SEO meta injected     │
  │                     └──────────────────────────────────────────────────────────────────────────────┘
  │                                   │ upload / delete                        │ notify
  └──── images (CDN URL) ◀────── Object storage (media files)          SMTP provider (lead e-mails)
```

- **Same origin** for site, admin and API. Session cookies stay first-party (`SameSite=Strict`), and production needs no CORS.
- **Media binaries live in object storage**; MongoDB stores only metadata and URLs (`DATABASE_SCHEMA.md` → `media`).
- **External services:** MongoDB (Atlas recommended), object storage (provider pending, D-018), SMTP (pending, D-019), and optionally Cloudflare Turnstile (pending, D-020).

## 2. Repository structure (npm workspaces)

```
bitbyte/
├─ client/          React 19 + Vite + Tailwind CSS v4 (public site AND admin UI, code-split)
├─ server/          Express 5 + Mongoose 9 API, SEO rendering, static hosting of client build
├─ shared/          Plain JS (ESM): zod schemas, enums, section registry definitions, slug rules
├─ e2e/             Playwright end-to-end + accessibility tests
├─ docs/            Project documentation (this folder)
├─ scripts/         Repo tooling (e.g. check-no-typescript.js)
├─ .github/workflows/ci.yml
├─ package.json     workspaces: ["client", "server", "shared", "e2e"]; root scripts
├─ .nvmrc           Node 22 LTS (≥ 22.22.0)
├─ .editorconfig  .gitignore  .prettierrc  eslint.config.js
└─ README.md
```

**Why `shared/`:** the same zod schema validates a section in the admin form (client) and in the API (server), so the two can never drift apart. `shared/` has no framework dependencies; it exports schemas, enums and pure helpers only.

## 3. Client (`client/`)

### 3.1 Structure
```
client/src/
├─ main.jsx                 bootstraps router + QueryClient; reads injected bootstrap data
├─ app/
│  ├─ router.jsx            route tree (public + admin), lazy-loaded route modules
│  ├─ providers.jsx         QueryClientProvider, error boundary, toast region
│  └─ RouteErrorBoundary.jsx
├─ layouts/
│  ├─ PublicLayout.jsx      header, main, footer; skip link; consumes site settings
│  ├─ AdminLayout.jsx       sidebar, top bar, auth guard (UX only — server enforces)
│  └─ PreviewLayout.jsx     PublicLayout + "Preview — not published" bar + noindex
├─ components/
│  ├─ ui/                   design primitives (Button, Link, Container, Section, Heading, Text,
│  │                        Card, Badge, Chip, Input, Textarea, Select, Checkbox, Field,
│  │                        Dialog, Drawer, Tabs, Toast, Skeleton, VisuallyHidden, Icon)
│  ├─ media/                ResponsiveImage, Logo, BitGrid (hero visual)
│  ├─ motion/               Reveal, useInView, useReducedMotion, viewTransition helpers
│  └─ seo/                  JsonLd, PageMeta (React 19 native <title>/<meta>)
├─ sections/                one folder per section type (renderer only)
│  ├─ registry.js           type → lazy renderer; mirrors shared/sections
│  └─ Hero/ RichText/ ServiceGrid/ ProjectShowcase/ Testimonials/ Stats/ FeatureList/
│     ProcessSteps/ SplitContent/ CtaBanner/ Faq/ EngagementModels/ ContactForm/
│     JobList/ ClientLogos/
├─ features/                domain modules: api hooks + feature components
│  ├─ site/  services/  projects/  testimonials/  careers/  contact/  pages/
│  └─ admin/ auth/ dashboard/ pages-editor/ services/ projects/ testimonials/ careers/
│            media-library/ leads/ settings/ seo/ redirects/ administrators/ audit-log/
├─ pages/                   thin route components (public/*, admin/*)
├─ services/api/
│  ├─ client.js             fetch wrapper: base URL, JSON, credentials, error normalisation,
│  │                        X-Requested-With header, 401 → redirect to /admin/login
│  └─ public.js admin.js auth.js   one function per endpoint (no fetch calls elsewhere)
├─ hooks/  lib/  utils/
└─ styles/index.css         Tailwind v4 entry; design tokens in @theme (see DESIGN_SYSTEM.md)
```

### 3.2 Rules
- **No business content in components.** Text, images, links, contact details and SEO come from the API. Components may only hold UI microcopy that isn't business content (e.g. "Close menu", "Loading…"), kept in `client/src/lib/ui-strings.js`.
- **Data fetching** goes through TanStack Query hooks in `features/*/api.js`, which call `services/api/*`. Components never call `fetch` directly.
- **Code splitting:** the admin area, the rich-text editor and drag-and-drop are separate lazy chunks. A public visitor never downloads admin code.
- **Section rendering:** a page's `sections[]` is mapped through `sections/registry.js`. An unknown type renders nothing in production and a visible warning in preview.
- **SSR-safe components:** no `window`/`document` access at module scope, so a move to server rendering stays possible later (D-007).

### 3.3 Routing (React Router, data/library mode)
| Pattern | Layout | Data |
|---|---|---|
| `/` , `/about`, `/services`, `/portfolio`, `/careers`, `/contact`, `/privacy-policy`, `/terms` | Public | `GET /public/pages/:slug` (fixed-template pages) |
| `/services/:slug` | Public | `GET /public/services/:slug` |
| `/portfolio/:slug` | Public | `GET /public/projects/:slug` |
| `/careers/:slug` | Public | `GET /public/jobs/:slug` |
| `/:slug` (custom pages, reserved words excluded) | Public | `GET /public/pages/:slug` |
| `/admin/login` | Auth | — |
| `/admin/*` | Admin | `/admin/*` endpoints |
| `/admin/preview/:entity/:id` | Preview | `/admin/preview/*` endpoints |
| `*` | Public | 404 page (server also sends HTTP 404) |

The full public route list with legacy redirects is in `ROUTE_MAP.md`.

### 3.4 State
- **Server state:** TanStack Query (cache, retries, invalidation after mutations).
- **Form state:** React Hook Form + zod resolver, using schemas from `shared/`.
- **UI state:** local component state. No global store library is needed.
- **Auth state:** `GET /auth/session` query. The admin route guard is cosmetic; every admin API call is authorised server-side.

## 4. Server (`server/`)

### 4.1 Structure
```
server/src/
├─ server.js            load config → connect DB → listen → graceful shutdown (SIGTERM)
├─ app.js               createApp({ config, logger }) — pure factory used by tests
├─ config/
│  ├─ env.js            zod-validated process.env; fails fast with a clear message
│  ├─ db.js             mongoose connection, sanitizeFilter, strictQuery
│  └─ logger.js         pino with redaction
├─ routes/
│  ├─ index.js          mounts /api/v1/{public,auth,admin}, health, 404 for unknown /api
│  ├─ public/*.routes.js
│  ├─ auth.routes.js
│  └─ admin/*.routes.js (router-level requireSuperAdmin)
├─ controllers/         parse req → call service → shape response (no DB access)
├─ services/            business rules: publishing, revisions, references, media, leads,
│                       mail, auth/sessions, audit, redirects, seo, placeholders
├─ models/              Mongoose schemas (one file per collection)
├─ validators/          request schemas (compose shared/ schemas: body, params, query)
├─ middleware/
│  ├─ requestId.js      X-Request-Id in/out, attached to logs
│  ├─ securityHeaders.js helmet with CSP
│  ├─ originCheck.js    blocks cross-site state-changing requests
│  ├─ session.js        reads cookie → loads session + user (req.admin) or nothing
│  ├─ requireSuperAdmin.js 401/403 enforcement
│  ├─ validate.js       validate(schema) for body/params/query → 422 on failure
│  ├─ rateLimits.js     named limiters (login, leads, uploads, admin, public)
│  ├─ upload.js         multer memory storage with limits
│  ├─ redirects.js      legacy/slug redirects before the SPA fallback
│  ├─ notFound.js
│  └─ errorHandler.js   AppError → JSON envelope; unknown → 500, no stack in production
├─ storage/             media adapters: local.js (dev), <provider>.js (prod) — same interface
├─ seo/                 renderShell.js (meta + bootstrap JSON injection), sitemap.js, robots.js
├─ cli/                 create-admin.js, reset-admin-password.js, seed.js (idempotent; never drops)
└─ utils/               AppError, pick, slugify, pagination, html sanitiser config
server/tests/           integration (supertest + in-memory MongoDB) and unit tests
```

### 4.2 Layering rules
`route → middleware (rate limit → origin check → session → requireSuperAdmin → validate) → controller → service → model`

- Controllers never import models; services never touch `req`/`res`.
- **All writes to publishable content go through services**, so revisions, audit entries, reference indexes and placeholder checks always happen.
- Express 5 forwards rejected promises to `errorHandler`, so no async wrapper is needed.
- Services throw `AppError(status, code, message, details)`. Nothing else is serialised to clients.

### 4.3 Request pipeline order (app.js)
1. `trust proxy` (exact hop count from config), `x-powered-by` disabled
2. `requestId`, `pino-http` logging
3. `securityHeaders` (helmet + CSP)
4. Compression (only if the host/proxy doesn't compress)
5. `express.json({ limit: '200kb' })` for API routes; multer only on upload routes
6. `cookie-parser`
7. `/api/v1/health`
8. `/api/v1/public`: public limiter, cache headers
9. `/api/v1/auth`: origin check, session, login limiter on `POST /login`
10. `/api/v1/admin`: origin check, session, `requireSuperAdmin`, admin limiter
11. Unknown `/api/*` → 404 JSON
12. `GET /sitemap.xml`, `GET /robots.txt`
13. `redirects` middleware (301/302 from the `redirects` collection, cached in memory, refreshed on change)
14. Static assets from `client/dist` (hashed files: `Cache-Control: public, max-age=31536000, immutable`)
15. SPA fallback: `renderShell` (HTML with injected meta + bootstrap JSON; `no-cache`; status 404 for unknown slugs)
16. `errorHandler`

## 5. API design summary
Full contract in `API_REFERENCE.md`.
- **Versioning:** URL prefix `/api/v1`. A breaking change gets `/api/v2`, with v1 kept until the client migrates. Additive changes stay in v1.
- **Envelope:** success `{ "data": …, "meta": {…} }`, error `{ "error": { "code", "message", "details", "requestId" } }`.
- **Visibility:** `/public/*` returns only `published` content, with draft fields stripped by projection, not by filtering in code. `/admin/*` returns drafts.
- **Validation:** zod in strict mode (unknown keys rejected) on body, params and query. 422 with field paths.
- **Concurrency:** every draft write carries the `revision` the editor loaded; a mismatch returns 409 `EDIT_CONFLICT`.

## 6. Rendering & SEO (D-007)
- The client is a single-page app. For **every non-API GET**, `seo/renderShell.js`:
  1. Resolves the URL to a published entity (page / service / project / job), or a 404.
  2. Injects `<title>`, meta description, canonical, robots, Open Graph/Twitter tags and JSON-LD into the built `index.html` template (cached in memory).
  3. Embeds **bootstrap data** (site settings + that route's published payload) as `<script type="application/json" id="bb-bootstrap">`, escaped so it can't break out of the script tag. This removes the first API round-trip and speeds up LCP.
  4. Returns 404 status for unknown slugs, so crawlers don't index soft-404s.
- `sitemap.xml` lists published pages, services, projects and open jobs with `lastmod`. `robots.txt` disallows `/admin` and `/api` and points to the sitemap.
- Upgrade path: React Router framework-mode SSR if search performance requires it (components are written SSR-safe).

## 7. Security boundaries & data flow

### 7.1 Trust zones
| Zone | Who | Can do | Enforced by |
|---|---|---|---|
| Public | Anonymous visitors, crawlers | Read published content; submit the contact form | Route separation (`/public`), published-only projections, rate limits, validation |
| Authenticated | `super_admin` (one role; possibly several named accounts, D-004) | Everything in `/admin/*` | `session` + `requireSuperAdmin` on the **router**, not per handler, so a forgotten check is impossible |
| System | CLI scripts run on the server | Create/reset admins, seed | Shell access to the host only; never exposed over HTTP |

There is **no public registration, login or account system**. The only login form is `/admin/login`.

### 7.2 Key flows
- **Login:** `POST /auth/login` → login limiter → origin check → zod → find user by email → argon2id verify (with a dummy hash when the user doesn't exist, to keep timing constant) → lockout checks → create session (random 256-bit token; store SHA-256 hash) → `Set-Cookie` → audit `auth.login`.
- **Admin write:** cookie → session lookup (by token hash, not expired, user active) → idle-timeout refresh → `requireSuperAdmin` → validate → service (revision check, sanitise, compute references, placeholder scan) → save → audit → respond.
- **Publish:** service validates the full draft with the strict "publishable" schema → refuses if `[CONFIRM …]` placeholders remain or referenced media/entities aren't published → copies `draft` → `published` → writes a `revisions` snapshot → audit → invalidates public cache → `published` changes go live.
- **Lead submission:** public limiter → honeypot + minimum fill-time check → optional Turnstile verify → zod → sanitise → store `leads` → queue notification e-mail (failure is logged, never lost) → generic success response.
- **Media upload:** upload limiter → multer (size cap, single file) → magic-byte check → `sharp` re-encode + variants + EXIF strip → storage adapter → `media` document → audit.

### 7.3 Controls (summary; details in `API_REFERENCE.md` §2)
argon2id hashing · opaque server-side sessions (HttpOnly, Secure, SameSite=Strict) · idle + absolute expiry · lockout · origin check on state-changing requests · strict validation, mass-assignment protection · Mongoose `sanitizeFilter` · server-side HTML sanitisation · CSP and security headers · upload re-encoding, no SVG uploads · rate limits · audit log · secrets only in environment · least-privilege DB user · no stack traces in responses · log redaction.

## 8. Configuration

All configuration comes from environment variables, validated at boot by `server/src/config/env.js`. The server refuses to start on invalid config. `server/.env.example` is committed; `.env` never is.

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | |
| `PORT` | `4000` | |
| `PUBLIC_SITE_URL` | `https://www.bitbyteindia.com` | Canonical URLs, sitemap, origin allowlist |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/bitbyte` | Atlas URI in production |
| `TRUST_PROXY_HOPS` | `1` | Exact proxy count, so rate limits see real IPs |
| `SESSION_COOKIE_NAME` | `__Host-bb_sid` (prod), `bb_sid` (dev) | |
| `SESSION_IDLE_MINUTES` / `SESSION_ABSOLUTE_HOURS` | `120` / `12` | |
| `ALLOWED_ORIGINS` | `https://www.bitbyteindia.com` | Comma-separated; dev adds `http://localhost:5173` |
| `MEDIA_DRIVER` | `local` / provider name (D-018) | |
| `MEDIA_LOCAL_DIR` | `./uploads` | Dev only; git-ignored |
| `MEDIA_PUBLIC_BASE_URL` | CDN or storage base URL | |
| Provider credentials | e.g. `CLOUDINARY_URL` or `S3_*` | Depends on D-018 |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | | Depends on D-019 |
| `TURNSTILE_SECRET_KEY` | | Optional (D-020) |
| `LOG_LEVEL` | `info` | |
| `IP_HASH_SALT` | random | Leads store a salted IP hash, not raw IPs |

Client build-time variables (`VITE_*`) carry **no secrets**; public keys such as the Turnstile site key are served from site settings.

## 9. Local development
- **Prerequisites:** Node ≥ 22.22 (`.nvmrc`), npm 10, and MongoDB 7+ running locally at `127.0.0.1:27017` (or a Docker container).
- **Setup:** `npm ci` → copy `server/.env.example` to `server/.env` → `npm run seed` (idempotent; inserts placeholder content, never drops) → `npm run admin:create`.
- `npm run dev` starts Vite (5173) and the API (4000, nodemon) together. Vite proxies `/api`, `/sitemap.xml` and `/robots.txt` to the API, so the browser sees one origin and needs no CORS.
- Other scripts: `npm run lint`, `npm run format`, `npm test` (all workspaces), `npm run test:e2e`, `npm run build` (client build), `npm start` (production server serving `client/dist`).
- The database is never reset by a script without an explicit `--force` flag and confirmation prompt. Tests use an in-memory MongoDB, never the dev database.

## 10. Production deployment & operations (host pending, D-021)
- **Build:** `npm ci && npm run build` in CI → artefact = `server/` + `shared/` + `client/dist`.
- **Runtime:** one Node process (PM2 or systemd on a VPS, or a managed Node platform) behind a TLS-terminating reverse proxy/CDN. Scale by adding instances only if needed. Rate-limit and session state are already in MongoDB or need a shared store at that point (noted in D-011).
- **Database:** MongoDB Atlas (Mumbai region recommended), with a least-privilege user (readWrite on the app DB only), daily backups and a tested restore procedure.
- **Media:** object storage + CDN (D-018), backed up or versioned by the provider.
- **Logging:** pino JSON to stdout → host log collection. Request ID on every line. Redaction of `authorization`, `cookie`, `password`, `token` and lead PII fields. Log levels: `info` in production, `debug` in development.
- **Monitoring:** `/api/v1/health` (`{ status, db }`, no version info) for uptime checks. Optional error tracking (D-022). Alerts on 5xx rate and failed lead e-mails.
- **Releases:** CI must pass (lint, unit, integration, build, e2e smoke, no-TS check, `npm audit --omit=dev --audit-level=high`) before deploy. Rollback = redeploy the previous artefact. Schema changes are additive, with idempotent migration scripts.
- Full procedure arrives in `DEPLOYMENT.md` (Stage 10).

## 11. Testing strategy
| Layer | Tool | Covers |
|---|---|---|
| Shared | Vitest | Section/entity schemas, slug and placeholder rules |
| Server unit | Vitest | Services: publish, revisions, references, sanitisation, lockout |
| Server integration | Vitest + Supertest + mongodb-memory-server | Every endpoint: auth (401/403), validation (422), conflicts (409), published-only visibility, rate limits |
| Client | Vitest + Testing Library | Primitives, section renderers, forms |
| End-to-end | Playwright (+ axe) | Visitor journeys, lead submission, admin login → edit → preview → publish, keyboard navigation, accessibility per template |
| Performance | Lighthouse CI | Budgets in `DESIGN_SYSTEM.md` §11 |
