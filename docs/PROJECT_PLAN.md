# Project Plan

| | |
|---|---|
| **Project** | Complete rebuild of the BitByte Software Technology website (`bitbyteindia.com`) with a full content-management admin |
| **Repository** | `bitbyte` (GitHub `robotronixindiatraining-gif/bitbyte`) |
| **Last updated** | 2026-10-15 (Stage 03) |
| **Status of stages** | `PROGRESS.md` · decisions in `DECISIONS.md` |

## 1. Goals
1. A premium, fast, accessible, responsive company website: a complete redesign, not a copy of the old site.
2. Every meaningful business item (pages, sections, services, portfolio, testimonials, careers, contact details, navigation, footer, SEO, media, leads) is managed by the `super_admin` **without code changes**.
3. Secure by design: server-side authorisation, hardened auth, validated input, safe uploads, auditability.
4. Only verified facts are published. Unverified content stays behind `[CONFIRM …]` placeholders that block publishing.
5. A maintainable codebase and documentation that matches it.

## 2. Scope
| In scope | Out of scope |
|---|---|
| Public site: home, about, services (index + 5 detail pages), portfolio (index + case studies), careers (+ job pages), contact (+ lead form), legal pages, custom pages | `training.bitbyteindia.com` and its content (D-003) |
| Admin: dashboard, page/section editor, entity managers, media library, settings, SEO and redirects, leads, administrators, activity log | Public user accounts, registration or login (D-004) |
| SEO: metadata, JSON-LD, sitemap, robots, legacy redirects | Additional roles (editor, staff, customer…) |
| Deployment, backups, monitoring, handover | Blog (D-016), e-commerce, online payments, multilingual content |
| | Legacy application or data migration (D-002) |

## 3. Stage sequence

| # | Stage | Status |
|---|---|---|
| 00 | Discovery & master planning | ✅ Done |
| 01 | Content extraction & asset inventory | 🟡 **Partially complete.** Live source not verified (see §4, track V) |
| 02 | Architecture & design specification | ✅ Approved with refinements (D-018–D-039) |
| 03 | Project foundation | ✅ Approved |
| 04 | Database & admin security foundation | 🟡 Implemented, awaiting approval |
| 05 | CMS APIs, media & leads | ⏸ |
| 06 | Design system implementation & public shell | ⏸ |
| 07 | Public website | ⏸ |
| 08 | Admin dashboard | ⏸ |
| 09 | Content verification, entry & QA | ⏸ |
| 10 | Deployment & launch | ⏸ |

### Stage details

**03: Project foundation**
- **Scope:** npm workspaces (`client`, `server`, `shared`); Vite + React + Tailwind v4 with design tokens from `DESIGN_SYSTEM.md`; Express app factory, env validation, structured logging, error envelope, request IDs, security headers, liveness/readiness health (D-041); Vite proxy; ESLint/Prettier; Vitest and Supertest; CI workflow; no-TypeScript guard; smoke test; `.nvmrc`, `.gitignore`, `.env.example`. (Playwright moves to Stage 06, D-040.)
- **Deliverables:** running skeleton, CI green, README setup section.
- **Depends on:** Stage 02 approval.
- **Tests:** health endpoint integration test; error-handler unit tests; client renders the shell; CI pipeline.
- **Acceptance:** on a clean machine, `npm ci && npm run dev` works; `npm run check` (no-TS guard, lint, format, tests, build, smoke) passes locally and in CI; no `.ts`/`.tsx` files; no secrets in Git. **Status:** met locally and in CI (GitHub Actions run #1 green).

**04: Database & admin security foundation** (implemented 2026-10-15; awaiting approval)
- **Scope:** all Mongoose models (`DATABASE_SCHEMA.md`, incl. `orderings`); shared zod schemas and section registry; sessions with `mfa_pending`/`enrollment`/`active` stages, argon2id, login/logout/change-password, **mandatory TOTP + recovery codes, step-up re-authentication and the reset rules of D-039**, lockout, rate limits, origin check, `requireSuperAdmin`; audit log; CLI `admin:create` / `admin:reset-password` / `admin:reset-2fa`; idempotent `seed` (placeholders; no legacy redirects needed, D-038); `mongodb-memory-server` for integration tests.
- **Depends on:** 03.
- **Tests:** 401/403 for every admin route (generated from the route table); no full session from a password alone; enrolment-restricted sessions; TOTP replay rejected; recovery codes single-use; step-up required for sensitive actions; reset actions never clear both factors; lockout and expiry; session revocation; validation 422s; seed idempotency; schema unit tests.
- **Acceptance:** all security tests pass; no admin route is reachable without a valid `super_admin` session; `API_REFERENCE.md` auth section matches the implementation. **Status:** met. 140 tests pass, plus a local end-to-end run against MongoDB 8.0 (`PROGRESS.md`). Scope refinements: the seed creates no portfolio projects (D-046); public content endpoints other than services, and the settings/orderings write APIs, move to Stage 05.

**05: CMS APIs, media & leads**
- **Scope:** every endpoint in `API_REFERENCE.md` §3 and §5: draft/publish/unpublish/discard/restore, preview, ordering, references and `IN_USE` checks, placeholder guard, consent/permission checks, **draft/published orderings (D-037)**, top-level slug resolution (D-038), redirects (automatic slug-change), media pipeline with the **Cloudinary** and local drivers (D-018), leads with **server-side Turnstile verification** (D-020), honeypot and the **Resend** mail adapter (D-019), lead retention purge (D-032), CSV export, erasure, careers application settings (D-031), dashboard summary, sitemap, robots and meta-injection service.
- **Depends on:** 04. Development and tests use the local media driver, the log mailer and Cloudflare's Turnstile test keys; real Cloudinary/Resend credentials are only needed for staging/production.
- **Tests:** integration per endpoint, including "public never returns drafts", 409 conflicts, upload rejections (wrong magic bytes, oversize, SVG), spam paths, CSV formula escaping; contract test keeping `API_REFERENCE.md` in sync.
- **Acceptance:** coverage ≥ 80 % for services/controllers; contract test green.

**06: Design system implementation & public shell**
- **Scope:** Playwright + axe e2e workspace (D-040), fonts, primitives (`DESIGN_SYSTEM.md` §8), BitGrid, motion utilities (reveal, view transitions, reduced motion), header with mega-panel and mobile drawer, footer, all section renderers, `ResponsiveImage`, text-wordmark logo fallback, dev-only component catalogue route, contrast-check script.
- **Depends on:** 03 (tokens), 05 (public API shape).
- **Tests:** component tests; axe on the catalogue; keyboard tests for nav, dialog and accordion; reduced-motion snapshot.
- **Acceptance:** every section type renders from API data in light, muted and dark variants; all token pairs pass the contrast script; routes are code-split so the public initial JS stays ≤ 120 KB gzip (the Stage 03 shell is already 110 KB).

**07: Public website**
- **Scope:** all public routes in `ROUTE_MAP.md` §2, with **legacy top-level service URLs preserved** (D-038); page compositions (`DESIGN_SYSTEM.md` §10); portfolio filtering; contact form end to end with Turnstile; 404; meta/JSON-LD/bootstrap injection; trailing-slash/case normalisation.
- **Depends on:** 06.
- **Tests:** Playwright journeys (navigate, filter portfolio, submit lead, redirects); axe on every template; Lighthouse CI budgets.
- **Acceptance:** Lighthouse ≥ 90 ×4 on mobile for home, service, portfolio and contact; CWV budgets met; **zero hardcoded business content** (grep check + review).

**08: Admin dashboard**
- **Scope:** every workflow in `ADMIN_GUIDE.md`: login, dashboard, page/section editor, entity editors, taxonomies, media library, settings tabs, SEO and redirects, leads inbox, administrators, activity log, preview, conflict handling, autosave.
- **Depends on:** 05, 06.
- **Tests:** Playwright: create → preview → publish → visible publicly; placeholder blocks publish; consent blocks publish; delete blocked when in use; conflict dialog; session expiry; mobile leads view.
- **Acceptance:** a non-developer completes the scripted tasks in `ADMIN_GUIDE.md` unaided; `ADMIN_GUIDE.md` is rewritten as the user guide with screenshots.

**09: Content verification, entry & QA**
- **Scope:** close track V (§4); the owner resolves `CONTENT_GAPS.md`; enter verified content and media; apply the real logo palette (D-024); accessibility manual pass (keyboard, NVDA/VoiceOver); OWASP ASVS L1 checklist; cross-browser and device testing; backup/restore rehearsal.
- **Depends on:** 07, 08, track V.
- **Acceptance:** **no `[CONFIRM …]` placeholder on any published item**; zero open high/critical issues; owner signs off on content.

**10: Deployment & launch**
- **Scope:** hosting per `DEPLOYMENT.md` (D-021), MongoDB Atlas, Cloudinary, Resend domain verification, Turnstile production keys, **domain verification before** DNS changes and canonical host (D-028), secrets, CI deploy, monitoring and alerts, backups (≤ 35 days), Search Console + sitemap, legacy URL verification, launch checklist, rollback plan, admin handover. Analytics only if approved (D-033).
- **Depends on:** 09; owner's hosting-provider choice; company-owned accounts for Atlas, Cloudinary, Resend and Cloudflare.
- **Acceptance:** live on the domain; every known legacy URL resolves (preserved, or 301 where it couldn't be preserved); backup restored successfully in a test; owner trained.

## 4. Parallel track V: content verification (carried over from Stage 01)
Stage 01 could not access the live site. Content verification continues alongside development and must finish before Stage 09.

| Step | Owner action | Unblocks |
|---|---|---|
| V1 | Provide access (allow-list the domain in the environment), a site export, or saved pages + screenshots | Upgrading the inventory from `indexed_unverified` to `verified_*`; full route list; assets |
| V2 | Supply the vector logo and any brand assets | Final palette (D-024), favicon, OG image |
| V3 | Answer `CONTENT_GAPS.md` §B conflicts and §C confirmations | Removing placeholders; publishing |
| V4 | Search Console export | Complete redirect map |
| V5 | Client permissions and testimonial consents | Publishing portfolio and testimonials |

## 5. Decision gates
| Decision | Needed before |
|---|---|
| Stage 04 approval | Stage 05 |
| Resend evaluation result (D-019): domain verification and deliverability | Production e-mail (Stage 10); the adapter allows a different provider |
| Cloudinary plan re-check under a company account (D-018) | Production media (Stage 10) |
| Careers `form` application method (D-031): applicant-data destination, handling, retention | Only if the owner wants an on-site application form |
| Hosting provider choice (D-021, `DEPLOYMENT.md` §2); domain verification (D-028) | Stage 10 |
| Analytics requirements and privacy review (D-033, deferred) | Any analytics work |

## 6. Risks (current)
| Risk | Mitigation |
|---|---|
| Source content still unverified (Stage 01 partial) | Placeholder guard; track V; no launch with placeholders |
| No logo, so the palette may change | Semantic tokens + documented derivation; palette applied in Stage 09 |
| Thin portfolio/testimonial material or no client consent | Consent gates; sections hide when empty; launch with fewer, verified items |
| Single all-powerful role | Lockout, audit, session limits, recommended 2FA, multiple named accounts |
| SEO loss on migration | 301 map, canonical host, sitemap, Search Console monitoring post-launch |
| Scope creep into a generic page builder | Approved section registry (D-008); new types via developer change only |
