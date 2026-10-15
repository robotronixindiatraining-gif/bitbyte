# Progress

Status of every stage. Updated at the end of each working session and each stage. Detailed actions are in `STAGE_LOG.md`.

| Stage | Name | Status | Updated |
|---|---|---|---|
| 00 | Discovery & master planning | ✅ Completed: approved with amendments | 2026-10-15 |
| 01 | Content extraction & asset inventory | 🟡 **Partially complete.** Approved as a partial deliverable by the owner. The original website was **not** accessed directly and all extracted content is **unverified**. Remaining verification continues as parallel track V (`PROJECT_PLAN.md` §4). | 2026-10-15 |
| 02 | Architecture & design specification | ✅ Approved with required refinements (incorporated: D-018 – D-039) | 2026-10-15 |
| 03 | Project foundation | ✅ Approved | 2026-10-15 |
| 04 | Database & admin security foundation | 🟡 **Implemented; all checks pass locally. Awaiting approval.** | 2026-10-15 |
| 05 | CMS APIs & media | ⏸ Not started | — |
| 06 | Design system implementation & public shell | ⏸ Not started | — |
| 07 | Public website | ⏸ Not started | — |
| 08 | Admin dashboard | ⏸ Not started | — |
| 09 | Content entry, QA & hardening | ⏸ Not started | — |
| 10 | Deployment & launch | ⏸ Not started | — |

## Confirmed project decisions (as of the Stage 02 approval)
- MERN stack, JavaScript only. **TypeScript is prohibited.** Tailwind CSS.
- A new website; the existing site supplies business content only, not design.
- **No legacy application or database** to migrate.
- `training.bitbyteindia.com` is **separate** and is not merged.
- **Exactly one administrative role: `super_admin`.** Public visitors are unauthenticated. No public registration, login or user accounts. All privileged actions are authorised on the backend.
- Unverifiable facts are recorded as `[CONFIRM …]` placeholders and never presented as verified.
- Multiple individually identifiable `super_admin` accounts with identical rights; **mandatory TOTP 2FA** with recovery codes (D-026, D-039).
- Cloudinary for media (D-018); Resend for notifications behind a replaceable adapter (D-019); Cloudflare Turnstile verified server-side (D-020).
- One domain, one Node service, managed MongoDB; hosting documented, not provisioned (D-021, `DEPLOYMENT.md`).
- Structured logging and request correlation; external error tracking optional (D-022).
- Canonical host `www` is provisional until the domain configuration is verified (D-028).
- Careers application workflow is configurable (D-031); lead retention is configurable, default 365 days (D-032); analytics deferred (D-033).
- **Existing URLs preserved** (service pages at `/<slug>`, D-038); ordering changes are drafted and published (D-037).

**Superseded parts of `STAGE_00_DISCOVERY_REPORT.md`:** §1.3 and §5.4 (legacy recovery/migration), §6.1 (three-role matrix), the `trainingPrograms` collection, and Q2/Q3/Q13 (now answered). The Stage 00 report is kept unchanged as a historical record; its superseded items are listed in `DECISIONS.md` ("Superseded items"), and the current plan is in `PROJECT_PLAN.md`.

## Stage 01: acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Every accessible page captured with its content, not just titles | ⚠️ Partial. 7 URLs found in the index; partial text for 6. **No page loaded directly** (environment network policy). |
| 2 | Every content item labelled by evidence quality | ✅ Done. All items `indexed_unverified` or `placeholder`/`conflict`. |
| 3 | Asset inventory with source, retrieval status and suggested filenames | ⚠️ Partial. Structure complete; **0 assets retrieved, 0 asset URLs found** |
| 4 | Route map with original URLs, proposed routes and redirects | ⚠️ Partial. Indexed service URLs are now preserved (D-038); 5 legacy URLs unknown |
| 5 | Gaps, conflicts and inaccessible items documented | ✅ Done (`CONTENT_GAPS.md`, 27 items) |
| 6 | Unavailable pages distinguished from confirmed non-existent pages | ✅ Done. None confirmed absent. |
| 7 | No invented content | ✅ Done |
| 8 | Owner has reviewed the inventory and answered the blocking confirmations | ❌ Pending |
| 9 | Logo obtained so the brand palette can be derived in Stage 02 | ❌ Pending |

**Owner decision (2026-10-15):** Stage 01 accepted as a **partial** deliverable. No further retries of the inaccessible site from this environment. Extraction is **not** claimed complete. Criteria 1, 3, 4, 8 and 9 move to track V and gate Stage 09.

**Stage 01 can be marked complete when:** criteria 1, 3 and 4 are upgraded through one access option (`CONTENT_GAPS.md` §A), the logo has arrived (9), and the owner has resolved or explicitly deferred the conflicts in `CONTENT_GAPS.md` §B (8).

## Stage 02: deliverables
| Deliverable | File | Status |
|---|---|---|
| Architecture | `ARCHITECTURE.md` | ✅ Drafted |
| Database schema | `DATABASE_SCHEMA.md` | ✅ Drafted |
| API contract | `API_REFERENCE.md` | ✅ Drafted |
| Design system (provisional palette) | `DESIGN_SYSTEM.md` | ✅ Drafted |
| Route & content architecture | `ROUTE_MAP.md` (classified K/I/N/C); `CONTENT_INVENTORY.md` unchanged (proposed routes already consistent) | ✅ |
| Admin workflows | `ADMIN_GUIDE.md` (workflow specification) | ✅ Drafted |
| Decisions | `DECISIONS.md` (D-001 – D-036) | ✅ Drafted |
| Plan | `PROJECT_PLAN.md` | ✅ Drafted |
| README | `README.md` (project status + docs index) | ✅ Updated |
| **Owner approval** | — | ✅ Approved with refinements (2026-10-15) |

## Stage 03: project foundation

### Acceptance criteria
| # | Criterion | Status |
|---|---|---|
| 1 | `client/`, `server/`, `shared/` workspaces with the approved structure | ✅ |
| 2 | React/Vite/Tailwind configured with the (provisional) design tokens | ✅ |
| 3 | Express backend with environment validation, structured logging, request IDs, safe error envelopes and security headers | ✅ |
| 4 | Shared JavaScript validation conventions (`shared/src/validation.js`, `validate()` middleware) | ✅ |
| 5 | Linting, formatting and test tooling | ✅ ESLint 9, Prettier, Vitest (+ Supertest, Testing Library) |
| 6 | `.gitignore` and `.env.example` files with placeholders only; no secrets in Git | ✅ (`git ls-files` checked; no `.env` tracked) |
| 7 | Frontend and backend health checks | ✅ `/api/v1/health`, `/api/v1/health/ready`; client status indicator |
| 8 | Development commands documented in `README.md` | ✅ |
| 9 | Smoke test: client builds and the production server starts | ✅ `npm run smoke` |
| 10 | No TypeScript | ✅ `npm run check:no-ts` |
| 11 | CI | ✅ GitHub Actions run #1 on commit `e747ad9` (Node from `.nvmrc`, `npm ci`, `npm run check`, `npm audit --omit=dev --audit-level=high`) **succeeded** |

### Verification results (2026-10-15, Node 22.22.0, npm 10.9.4)
| Command | Result |
|---|---|
| `npm run check:no-ts` | ✅ No TypeScript found |
| `npm run lint` | ✅ 0 problems |
| `npm run format:check` | ✅ All files formatted |
| `npm test` | ✅ shared 9/9 · server 25/25 · client 7/7 (**41 tests**) |
| `npm run build` | ✅ JS 350.0 KB (110.4 KB gzip), CSS 10.8 KB (3.2 KB gzip) |
| `npm run smoke` | ✅ 10/10 checks (build present, production start without DB, liveness 200, readiness 503, SPA served, CSP + HSTS, deep-link fallback, API 404 envelope, graceful SIGTERM) |
| `npm run dev` (manual) | ✅ Vite proxy → API health, with and without `server/.env` |
| `npm audit` (on install) | ✅ 0 vulnerabilities |

### Packages installed (Stage 03)
| Workspace | Package (version) | Why |
|---|---|---|
| shared | zod 4.6.7 | Shared validation schemas |
| shared (dev) | vitest 5.0.5 | Tests |
| server | express 5.3.0, mongoose 9.11.2, helmet 8.3.0, pino 10.4.0, pino-http 11.0.0, zod 4.6.7 | API framework, MongoDB connection, security headers, structured logging, request logging, config/request validation |
| server (dev) | vitest 5.0.5, supertest 7.3.1, pino-pretty 13.2.0 | Tests, HTTP assertions, readable dev logs |
| client | react 19.3.1, react-dom 19.3.1, react-router 8.4.0, @tanstack/react-query 5.104.3 | UI, routing, server-state caching |
| client (dev) | vite 8.3.4, @vitejs/plugin-react 6.1.2, tailwindcss 4.3.3, @tailwindcss/vite 4.3.3, vitest 5.0.5, jsdom 29.1.1, @testing-library/react 16.3.3, @testing-library/dom 10.4.2, @testing-library/jest-dom 7.0.1 | Build, styling, component tests |
| root (dev) | eslint 9.39.5, @eslint/js 9.39.5, globals 17.13.0, eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 7.1.1, eslint-plugin-jsx-a11y 6.10.2, eslint-config-prettier 10.1.8, prettier 3.9.10, concurrently 10.0.6 | Linting (incl. accessibility), formatting, running client + server together |

No packages were removed or upgraded (none existed). Version choices and the deliberate ESLint 9 / jsdom 29 pins are explained in `DECISIONS.md` D-040.

### Known issues and limitations
- **No MongoDB in the build environment:** the database connection was exercised only for the failure and retry path (unreachable URI). A successful connection is first tested in Stage 04 (`mongodb-memory-server`, then a local MongoDB).
- **Bundle headroom:** the shell already uses 110.4 KB of the 120 KB gzip budget (React + router + query). Route-level code splitting is a Stage 06 acceptance criterion.
- **Fonts not installed yet:** the tokens reference Plus Jakarta Sans, Inter and JetBrains Mono, which arrive in Stage 06; system fonts are used until then.
- **Prettier stability:** one file needed a second formatting pass (a known Prettier member-chain quirk); it is stable now.
- The foundation page is temporary and is replaced by the CMS-driven homepage in Stage 07.

## Stage 04: database and admin security foundation

### Acceptance criteria
| # | Criterion | Status |
|---|---|---|
| 1 | Mongoose models + indexes for the 15 documented collections; no undocumented collections | ✅ (`test/models.test.js` lists the collections and checks key indexes) |
| 2 | Draft/publish model with placeholders, references, revisions, conflict protection | ✅ (`test/publication.test.js`) |
| 3 | argon2id passwords; mandatory TOTP; single-use hashed recovery codes | ✅ |
| 4 | Server-side sessions with idle/absolute expiry; HttpOnly, SameSite=Strict (Secure + `__Host-` in production) cookies | ✅ |
| 5 | CSRF protection for cookie-authenticated writes | ✅ Origin/Referer allowlist + `X-Requested-With` + JSON-only |
| 6 | Login rate limiting, temporary lockout, generic errors | ✅ |
| 7 | Sessions invalidated after password/2FA changes; step-up for sensitive actions | ✅ |
| 8 | **A password alone never establishes an admin session** | ✅ (tested for every admin route) |
| 9 | Exactly one role; multiple accounts; no public registration or public admin creation | ✅ |
| 10 | CLI: create first/additional admin, reset password, reset 2FA; production guard; safe re-runs | ✅ (`test/cli.test.js` + manual run on real MongoDB) |
| 11 | Audit log with actor, action, target, time, request ID; no secrets; fail-closed | ✅ (`test/admins.test.js`) |
| 12 | Idempotent placeholder seed that never overwrites admin edits or accounts | ✅ (`test/seed.test.js`) |
| 13 | Public routes expose only published content | ✅ (services endpoints; the rest arrive in Stage 05) |
| 14 | Docs updated; full pipeline green | ✅ locally and in CI: GitHub Actions run on `06456b4` succeeded. CI downloaded and cached MongoDB 8.0.34 for `mongodb-memory-server`; `npm run check` took 43 s and the production `npm audit` passed |

### Verification results (2026-10-15, Node 22.22.0, npm 10.9.4, MongoDB 8.0.34)
| Check | Result |
|---|---|
| `npm run check:no-ts` | ✅ No TypeScript found |
| `npm run lint` / `format:check` | ✅ clean |
| `npm test` | ✅ shared 19 · server 114 · client 7 = **140 tests** (server suites run on an isolated in-memory MongoDB 8.0.34) |
| `npm run build` | ✅ JS 110.4 KB gzip (unchanged: shared content schemas are tree-shaken) |
| `npm run smoke` | ✅ 12/12, incl. "auth answers 503 while the DB is down" and "cross-origin writes rejected" |
| **Real MongoDB** (Docker `mongo:8.0`, 8.0.34, local) | ✅ seed (31 created, rerun 0 created), `admin:create` (+ safe rerun), production guard, and a full HTTP flow on a running server: readiness 200 → password → enrolment-only 403 → enrol → `PASSWORD_CHANGE_REQUIRED` → change password → admin API 200 → audit log → logout → 401. Throwaway databases dropped afterwards. |
| `npm audit` (on install) | ✅ 0 vulnerabilities |

### Packages installed (Stage 04)
| Workspace | Package (version) | Why |
|---|---|---|
| server | argon2 0.45.1 | argon2id password hashing (prebuilt native binary; verified loading on Node 22.22) |
| server | otpauth 9.5.2 | RFC 6238 TOTP |
| server | qrcode 1.5.4 | Enrolment QR code (data URL) |
| server | express-rate-limit 8.7.1 | Login / second-factor / admin / public rate limits |
| server | cookie-parser 1.4.7 | Session cookie parsing |
| server (dev) | mongodb-memory-server 11.3.0 | Isolated MongoDB per test file |

No packages removed or upgraded.

### Security limitations and known issues (honest status)
- **Not a production security verification.** The controls are covered by automated tests and a local end-to-end run; no penetration test, dependency review beyond `npm audit`, or production configuration review has been done (planned for Stage 09).
- **In-memory rate limits:** they reset on restart and are per process. This is fine for a single instance; it needs a shared store if scaled out (D-011).
- **Notification e-mails are log-only** until the Resend driver (Stage 05, D-048). Admins are not actually e-mailed yet.
- **`mongodb-memory-server` in this environment** uses a `mongod` binary extracted from the official image (`MONGOMS_SYSTEM_BINARY`), because MongoDB's download host is blocked here. CI downloads the same version.
- **No transactions:** publishing is one atomic document update followed by the revision/audit writes. If the process dies between them, the item is live but its revision snapshot may be missing (logged; it does not corrupt content).
- **Prettier** occasionally needs two passes on long member chains (cosmetic).

## Dependencies (summary)
Stages 00–02: none. Stage 03: see the Stage 03 table. Stage 04: see the table above. Planned additions by stage are listed in `DECISIONS.md` D-036.
