# bitbyte

A complete rebuild of the **BitByte Software Technology** company website (`bitbyteindia.com`): a premium, responsive public site plus a secure admin dashboard where super administrators manage all business content without code changes.

> **Status:** Stage 06 (visual design system and homepage) is implemented and awaiting design review. Built so far: the data models and admin security, the complete CMS/admin API, the public read API, lead handling and retention, server-side SEO, and now the public design system: tokens, self-hosted fonts, UI primitives, header with mega-menu and mobile drawer, footer, all 15 section renderers and the CMS-driven homepage. **The homepage shows a neutral holding page until verified content is published** (no business facts are invented; see `docs/CONTENT_GAPS.md` CG-12/CG-28). Cloudinary, Resend and Turnstile production configuration is still pending. Inner public pages (Stage 07) and the admin screens (Stage 08) are next. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Stack
MongoDB (Mongoose 9) · Express 5 · React 19 (Vite 8) · Node.js 22 LTS · Tailwind CSS v4. **JavaScript only. TypeScript is not allowed anywhere** (enforced by `npm run check:no-ts`).

## Repository layout
```
client/   React app (public website + admin UI), Vite, Tailwind tokens
server/   Express API (/api/v1), CMS/media/lead services, SEO HTML shell, sitemap/robots, jobs, CLI
shared/   Plain-JS constants, error codes and zod validation helpers used by client and server
e2e/      Browser tests (Playwright + axe) against the production build and the dev catalogue
scripts/  Repository tooling: TypeScript guard, contrast check, bundle budget, smoke test
docs/     Project documentation (see below)
```

## Prerequisites
- **Node.js ≥ 22.22.0** (see `.nvmrc`; e.g. `nvm use`) and npm ≥ 10
- **MongoDB 8.0** for local development at `mongodb://127.0.0.1:27017`, for example with Docker: `docker run -d --name bitbyte-mongo -p 27017:27017 mongo:8.0`. The server also starts **without** a database: health then reports `db: "disabled"` or `"connecting"`, and database-backed routes answer `503`.

## Getting started
```bash
npm ci                                   # install all workspaces from the lockfile
cp server/.env.example server/.env       # local settings (placeholders only)
npm run secrets:generate                 # paste the three printed values into server/.env
npm run seed                             # insert placeholder content (drafts only; safe to re-run)
npm run admin:create -- --email you@example.com --name "Your Name"   # prints a one-time password
npm run dev                              # API on :4000 + Vite on :5173 (proxies /api to the API)
```
Open http://localhost:5173 for the homepage. With a fresh database it shows the holding page, because the seeded homepage is an unpublished draft with `[CONFIRM …]` placeholders. The admin UI arrives in Stage 08; until then the admin API can be exercised over HTTP (`docs/API_REFERENCE.md`). First sign-in = password → authenticator enrolment → new password (`docs/ADMIN_GUIDE.md` §1.2).

Development needs no third-party accounts: media are stored in `server/uploads/` (git-ignored), e-mails are not sent (`MAIL_DRIVER=log`), and search engines are blocked. The public contact form answers 503 until a Turnstile secret is set (Cloudflare's documented test keys work locally) and the Contact form settings are published.

### Component catalogue and homepage preview (development only)
With `npm run dev` running:
- http://localhost:5173/__dev/catalogue: colour and type tokens, icons, buttons/links/cards/badges, loading/empty/error states, the real header (mega-menu, mobile drawer below 1024 px) and footer, and **all 15 section types**. Add `?surface=light`, `?surface=muted` or `?surface=dark` to render every section on one surface; the last block shows missing/optional-data cases.
- http://localhost:5173/__dev/catalogue/home: the full homepage composition (dark BitGrid hero → services → about teaser → portfolio → process → CTA), built from **labelled development fixtures** (`client/src/dev/fixtures.js`: fictional "Example …" content and the provisional hero proposal CG-28).

The catalogue exists only on the development server: production builds do not contain the route or the fixtures (a browser test checks this).

### Previewing the production build locally
```bash
npm run build && npm start        # serves client/dist + API on http://localhost:4000 (needs MongoDB for content)
```
The server injects each page's published content and metadata into the HTML. To see the homepage with content, publish the `home` page (and settings) through the admin API.

`server/.env` is loaded only when it exists, and real environment variables take precedence. **Never commit `.env` files or generated secrets.** Only the `*.env.example` files, which hold placeholders, are tracked.

## Commands (run from the repository root)
| Command | What it does |
|---|---|
| `npm run dev` | Starts the API (`node --watch`) and the Vite dev server together |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Starts the server; serves `client/dist` when it exists (set `NODE_ENV=production` in production) |
| `npm test` | Runs the Vitest suites in `shared`, `server` and `client` |
| `npm run lint` | ESLint (React, hooks and accessibility rules) |
| `npm run format` / `npm run format:check` | Prettier write / check (Markdown is excluded) |
| `npm run check:no-ts` | Fails if any TypeScript file, config or dependency is present |
| `npm run smoke` | After `npm run build`: starts the production server and checks it serves the app and health endpoints |
| `npm run test:e2e` | Browser tests (Playwright + axe) — run `npm run build` first; starts `vite preview` and the dev server itself |
| `npm run check:contrast` | WCAG contrast of every semantic colour pair on every surface |
| `npm run check:bundle` | After a build: initial JavaScript must stay ≤ 120 KB gzip |
| `npm run check` | Everything CI runs: no-TS guard, contrast, lint, format check, tests, build, bundle budget, smoke test, browser tests |
| `npm run secrets:generate` | Prints fresh values for `TOTP_ENCRYPTION_KEY`, `RECOVERY_CODE_PEPPER`, `IP_HASH_SALT` (writes nothing) |
| `npm run seed` | Inserts missing placeholder content; never changes existing content or admin accounts |
| `npm run admin:create -- --email … --name "…"` | Creates a super admin with a one-time temporary password |
| `npm run admin:list` | Lists administrators (no secrets) |
| `npm run admin:reset-password -- --email …` | Emergency password reset (2FA unchanged) |
| `npm run admin:reset-2fa -- --email …` | Emergency 2FA reset (password unchanged) |
| `npm run retention:run` | Counts leads past their retention date (dry run); add `-- --apply` to delete them |
| `npm run test:coverage -w server` | Server tests with a coverage report (target ≥ 80 % lines for services/controllers) |

Admin, seed and retention commands refuse to run with `NODE_ENV=production` unless `--allow-production` is added (`docs/ADMIN_GUIDE.md` §1.1).

### Tests and MongoDB
Server tests start a throwaway MongoDB per test file with `mongodb-memory-server` (pinned to 8.0.34). They never touch your development database, and Cloudinary, Resend and Turnstile are replaced by test doubles, so no credentials or network access to those services are needed. `server/test/contract.test.js` keeps `docs/API_REFERENCE.md` in sync with the routes. The `mongod` binary is downloaded on first run. Where downloads are blocked, point the tests at a local `mongod` 8.0 binary:
```bash
MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test
```

### Browser tests
Playwright is pinned to 1.56.1 (Chromium build 1194). Install the browser once with `npx -w e2e playwright install chromium` (CI does this automatically; environments with a preinstalled Chromium can set `PLAYWRIGHT_BROWSERS_PATH`). The tests mock the public API, so no database is needed. Reports and screenshots go to `e2e/test-results/` (git-ignored).

Workspace-specific scripts: `npm run <script> -w server|client|shared|e2e`.

## Configuration
Server settings are environment variables, validated at start-up by `server/src/config/env.js`. The server refuses to start with invalid configuration and lists every problem. See `server/.env.example` and `docs/ARCHITECTURE.md` §8 for the full list. In production, `PUBLIC_SITE_URL` (https), `MONGODB_URI`, `TOTP_ENCRYPTION_KEY`, `RECOVERY_CODE_PEPPER` and `IP_HASH_SALT` are required. Cloudinary (`MEDIA_DRIVER=cloudinary`, `CLOUDINARY_URL`), Resend (`MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM`) and Turnstile (`TURNSTILE_SECRET_KEY`) are activated by configuration only; until then uploads and the contact form answer 503 and no e-mail is sent (`docs/DEPLOYMENT.md` §4–4b). Search indexing requires `ROBOTS_ALLOW_INDEXING=true` in production; the canonical-host redirect (`CANONICAL_HOST`) stays off until the domain is verified.

## Key decisions
- One deployable Node service serves the website, the admin UI and a versioned REST API (`/api/v1`) from a single domain.
- Hybrid CMS: dedicated collections plus pages built from approved section types, with draft → preview → publish. Ordering changes are published too.
- Exactly one administrative role, `super_admin` (several named accounts allowed), with mandatory TOTP two-factor authentication. Visitors are anonymous; there is no public registration or login.
- Existing URLs such as `/cms-development`, `/internet-of-things` and `/digital-marketing` are preserved.
- Cloudinary (media), Resend (notification e-mail, replaceable) and Cloudflare Turnstile (verified server-side). Third-party analytics is deferred.
- Unverified business facts are stored as `[CONFIRM …]` placeholders, which **cannot be published**.
- `training.bitbyteindia.com` is a separate property and is not part of this project.

## Documentation
| Document | Purpose |
|---|---|
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | Scope, stages, acceptance criteria, decision gates |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Current status of every stage, installed packages |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System structure, security boundaries, configuration, implementation status |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | MongoDB collections, relationships, indexes, section types |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | REST API contract (public, auth, admin) |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Visual design, tokens (provisional palette), components, motion, accessibility; §13 = as built in Stage 06 |
| [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) | Super-admin workflows |
| [`docs/ROUTE_MAP.md`](docs/ROUTE_MAP.md) | Public/admin routes, preserved legacy URLs, redirects |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Proposed hosting setup (nothing provisioned), backups, launch checklist |
| [`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md) | Content extracted from the current site (unverified) |
| [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md) | Logos and media (none retrieved yet); fonts and icons in use, with licences |
| [`docs/CONTENT_GAPS.md`](docs/CONTENT_GAPS.md) | Missing, conflicting and unverified information to confirm |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log |
| [`docs/STAGE_LOG.md`](docs/STAGE_LOG.md) | Per-stage actions, methods and validation |
| [`docs/STAGE_00_DISCOVERY_REPORT.md`](docs/STAGE_00_DISCOVERY_REPORT.md) | Original discovery report (historical; superseded items are listed in `DECISIONS.md`) |
