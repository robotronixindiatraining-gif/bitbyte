# bitbyte

A complete rebuild of the **BitByte Software Technology** company website (`bitbyteindia.com`): a premium, responsive public site plus a secure admin dashboard where super administrators manage all business content without code changes.

> **Status:** Stage 03 (project foundation) is complete and awaiting approval. The workspaces, tooling, configuration, error handling and health checks exist. The website, CMS and admin authentication are built in later stages. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Stack
MongoDB (Mongoose 9) · Express 5 · React 19 (Vite 8) · Node.js 22 LTS · Tailwind CSS v4. **JavaScript only. TypeScript is not allowed anywhere** (enforced by `npm run check:no-ts`).

## Repository layout
```
client/   React app (public website + admin UI), Vite, Tailwind tokens
server/   Express API (/api/v1), security headers, logging, health checks, serves the client build
shared/   Plain-JS constants, error codes and zod validation helpers used by client and server
scripts/  Repository tooling: TypeScript guard, smoke test
docs/     Project documentation (see below)
```

## Prerequisites
- **Node.js ≥ 22.22.0** (see `.nvmrc`; e.g. `nvm use`) and npm ≥ 10
- **MongoDB 7+** for local development, e.g. at `mongodb://127.0.0.1:27017`. The server also starts **without** a database: health then reports `db: "disabled"` or `"connecting"`. No database schemas exist yet (Stage 04).

## Getting started
```bash
npm ci                                   # install all workspaces from the lockfile
cp server/.env.example server/.env       # optional: local settings (placeholders only)
npm run dev                              # API on :4000 + Vite on :5173 (proxies /api to the API)
```
Open http://localhost:5173. The temporary foundation page shows whether the client can reach the API and the database. The API health endpoints are http://localhost:5173/api/v1/health (liveness) and `/api/v1/health/ready` (readiness).

`server/.env` is loaded only when it exists, and real environment variables take precedence. **Never commit `.env` files.** Only the `*.env.example` files, which hold placeholders, are tracked.

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
| `npm run check` | Everything CI runs: no-TS guard, lint, format check, tests, build, smoke test |

Workspace-specific scripts: `npm run <script> -w server|client|shared`.

## Configuration
Server settings are environment variables, validated at start-up by `server/src/config/env.js`. The server refuses to start with invalid configuration and lists every problem. See `server/.env.example` for the variables used now and those reserved for later stages, and `docs/ARCHITECTURE.md` §8 for the full list. In production, `PUBLIC_SITE_URL` (https) and `MONGODB_URI` are required.

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
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Visual design, tokens (provisional palette), components, motion, accessibility |
| [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) | Super-admin workflows |
| [`docs/ROUTE_MAP.md`](docs/ROUTE_MAP.md) | Public/admin routes, preserved legacy URLs, redirects |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Proposed hosting setup (nothing provisioned), backups, launch checklist |
| [`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md) | Content extracted from the current site (unverified) |
| [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md) | Logos and media (none retrieved yet) |
| [`docs/CONTENT_GAPS.md`](docs/CONTENT_GAPS.md) | Missing, conflicting and unverified information to confirm |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log |
| [`docs/STAGE_LOG.md`](docs/STAGE_LOG.md) | Per-stage actions, methods and validation |
| [`docs/STAGE_00_DISCOVERY_REPORT.md`](docs/STAGE_00_DISCOVERY_REPORT.md) | Original discovery report (historical; superseded items are listed in `DECISIONS.md`) |
