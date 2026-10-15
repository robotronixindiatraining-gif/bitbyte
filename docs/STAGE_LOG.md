# Stage Log

A chronological record of actions, retrieval methods, issues and validation results for each stage. Newest stage at the bottom.

---

## Stage 00: Discovery & master planning (2026-10-15)

- Inspected the repository: 1 commit (`e3a0499`), `README.md` only, clean tree.
- Environment: Node v22.22.0, npm 10.9.4, no MongoDB in the container.
- The website couldn't be reached (proxy 403; WebFetch DNS failure). Compiled indexed and third-party information.
- Researched current npm versions (read-only `npm view`; nothing installed).
- Delivered `docs/STAGE_00_DISCOVERY_REPORT.md` (commit `3de0c29`).
- **Outcome:** approved by the owner, with amendments (see Stage 01 §1).

---

## Stage 01: Content extraction & asset inventory (2026-10-15)

### 1. Decisions received with the approval
| Decision | Effect on the plan |
|---|---|
| No legacy application or database exists | Stage 00 §1.3 (legacy snapshot) and §5.4 (DB backup/migration) **dropped** |
| `training.bitbyteindia.com` is a separate property; don't merge | `trainingPrograms` collection and training enquiry type **dropped**; training content excluded from the inventory |
| Exactly one role: `super_admin`; no public accounts | Stage 00 §6.1 three-role matrix **superseded**; all admin capabilities belong to `super_admin`, still enforced server-side |
| Missing facts become explicit placeholders | `[CONFIRM …]` convention adopted across the docs |

### 2. Direct website access attempts

All attempts on 2026-10-15 from the cloud build environment.

| # | Method | Target(s) | Result |
|---|---|---|---|
| 1 | `git fetch` + status | repository | Branch `claude/amazing-sagan-mwrdn8` up to date with origin; clean |
| 2 | `curl` via the environment proxy | `https://www.bitbyteindia.com/`, `https://bitbyteindia.com/`, `http://www.bitbyteindia.com/`, `http://bitbyteindia.com/`, `/robots.txt`, `/sitemap.xml` | All `000`. Proxy refuses the CONNECT (`403`, `connect_rejected`) |
| 3 | Local DNS (`getent hosts`) | both hosts | No resolution (DNS is delegated to the proxy) |
| 4 | WebFetch tool | `https://www.bitbyteindia.com/` | `getaddrinfo ENOTFOUND www.bitbyteindia.com` |
| 5 | WebFetch via reader proxy | `https://r.jina.ai/https://www.bitbyteindia.com/` | `getaddrinfo ENOTFOUND r.jina.ai` |
| 6 | WebFetch via archive | `https://archive.ph/newest/…`; `web.archive.org` (Stage 00) | "Claude Code is unable to fetch from archive.ph" / "…web.archive.org" |
| 7 | Headless Chromium (Playwright 1.56.1, `/opt/pw-browsers/chromium-1194`) through the proxy | `https://www.bitbyteindia.com/`, `https://bitbyteindia.com/`, `http://www.bitbyteindia.com/` | `net::ERR_TUNNEL_CONNECTION_FAILED`; the http variant was interrupted by `chrome-error://chromewebdata/` |
| 8 | Control test, same Chromium | `https://example.com/` | `net::ERR_TUNNEL_CONNECTION_FAILED`, **which proves the block is environment-wide, not specific to the site** |
| 9 | Interactive browser tools (built-in browser, Chrome extension, computer use) | — | Not connected to this session (tool search returned none) |

**Conclusion:** the network policy for this environment allows only package registries. The website's live state is **unknown**: it is neither confirmed up nor confirmed down.

### 3. Supplementary retrieval: search indexes
WebSearch (standard and extended modes), about 20 queries, including:
`site:bitbyteindia.com`; `bitbyteindia.com web development`; `… mobile app development`; `… internet of things IoT`; `… digital marketing SEO`; `… cms-development`; `… portfolio`; `… about us`; `… contact us`; `"bitbyteindia.com/web-development"`; `"bitbyteindia.com/mobile-app-development" OR "/about" OR "/services"`; homepage-title query; portfolio project-name queries; IoT, digital-marketing and CMS phrase queries; contact-form query; careers queries; testimonials; privacy/terms; logo image query; Clutch review query.

**Main-site URLs discovered in the index (7):** `/`, `/careers/`, `/cms-development`, `/internet-of-things`, `/digital-marketing`, `/portfolio`, `/contact`.
**Menu-only pages (URL unknown):** About Us, Company, Web Development, Mobile App Development, "Get Started with us".
**Training-site URLs seen and excluded:** `training.bitbyteindia.com/`, `/about/`, `/industrial-training/`, `/iot/`.

**Fidelity issue:** search results arrive summarised by an intermediate tool. Only fragments returned in quotation marks are recorded as `snippet-quoted`; everything else is `snippet-paraphrased` and is not treated as original wording.

### 4. Issues encountered
| Issue | Handling |
|---|---|
| Many similarly named, unrelated companies (BitByte Innovations, Bit Byte Technology Ltd, BitBytes, BitByteInfo, Bitbyte Creations, Bit n Byte, BitByte IT Services, bitbyteconsulting.com) | Excluded; only content attributed to the `bitbyteindia.com` domain was used |
| Portfolio snippet repeated project names in different positions | De-duplicated to 8 distinct projects; category assignments marked `conflict` where reads disagreed |
| One summary attributed a Clutch review to "Xpression Graphics"; another said the Clutch profile has no reviews | Recorded as conflicting third-party information; not used |
| One summary called Robotronix a "related entity" | Not treated as fact; raised as a question (CG-08) |
| Training-site pages surfaced repeatedly | Excluded by decision; only the conflicting phone number was noted, as a conflict (CG-05) |

### 5. Validation performed
| Check | Result |
|---|---|
| Route inventory revisited against the indexed menu for missing internal pages | 5 menu-linked pages have unknown URLs; listed in `ROUTE_MAP.md` and `CONTENT_GAPS.md` |
| Duplication check | The shared intro sentence, contact block and `<title>` appeared on several pages. Recorded **once** as global content (inventory §G) with an "observed on" list; not duplicated per page. |
| Every item labelled | Every row in `CONTENT_INVENTORY.md` carries a label; 0 `verified_live`, 0 `verified_source` |
| Unavailable vs non-existent | No page marked as non-existent; see `CONTENT_GAPS.md` §D |
| Invented content | None. Every unknown is a `[CONFIRM …]` placeholder; no statistics, testimonials, prices or legal status created |
| Original wording | Quoted fragments kept with original spelling and grammar ("wordpress", "Bitbyte evaluate", "and needs one, or a combination,") |
| Repository | No code written, no dependencies installed, no database touched, Git history preserved |

### 6. Stage 01 status
**Extraction carried out to the limit of the available access; acceptance criteria not met** (see `PROGRESS.md`). Waiting on the owner for the access option (`CONTENT_GAPS.md` §A) and the confirmations.

### 7. Partial approval (2026-10-15)
The owner approved Stage 01 as a **partial** deliverable: the original website was not accessed directly and the extracted content remains unverified. Instructed: no further retries of inaccessible sites from this environment; do not claim extraction is complete. The remaining verification moved to parallel track V (`PROJECT_PLAN.md` §4), which gates Stage 09.

---

## Stage 02: Architecture & design specification (2026-10-15)

### 1. Inputs reviewed
`STAGE_00_DISCOVERY_REPORT.md`, `CONTENT_INVENTORY.md`, `ASSET_INVENTORY.md`, `ROUTE_MAP.md`, `CONTENT_GAPS.md`, `PROGRESS.md`, this log, and the confirmed decisions from the Stage 01/02 approvals (single `super_admin` role, no public accounts, no legacy migration, training site excluded, placeholders for unverified facts).

### 2. Actions
| Action | Result |
|---|---|
| Wrote the architecture | `ARCHITECTURE.md`: single service, npm workspaces, layering, pipeline, rendering/SEO, security zones, config, local dev, deployment, testing |
| Wrote the database schema | `DATABASE_SCHEMA.md`: 14 collections; pricing/blog/training/team evaluated and not created; section registry (15 types); indexes; deletion policy; seeding |
| Wrote the API contract | `API_REFERENCE.md`: envelope, error codes, auth/security model, public/auth/admin endpoints, security matrix |
| Wrote the design system | `DESIGN_SYSTEM.md`: **provisional** palette with computed contrast ratios, typography, layout, motion, states, components, section designs, navigation, page compositions, budgets, admin UI |
| Wrote the admin workflows | `ADMIN_GUIDE.md`: workflow specification (becomes the user guide in Stage 08) |
| Wrote the decision log | `DECISIONS.md`: D-001…D-036 with status; Stage 00 superseded items listed |
| Wrote the project plan | `PROJECT_PLAN.md`: scope, stages 03–10 with acceptance criteria, track V, decision gates |
| Reclassified the routes | `ROUTE_MAP.md`: Known / Inferred / New / Needs confirmation; admin routes added |
| Updated the README | Project status and documentation index (no setup instructions yet; nothing to install) |
| Left unchanged | `CONTENT_INVENTORY.md` (its proposed routes already match `ROUTE_MAP.md`), `ASSET_INVENTORY.md`, `CONTENT_GAPS.md`, `STAGE_00_DISCOVERY_REPORT.md` (historical) |

### 3. Validation
| Check | Result |
|---|---|
| Contrast ratios | Computed with the WCAG formula for every documented pair (scratch script, not committed). Two failing pairs found and banned: `accent-600` on navy (2.81) and `neutral-400` on white (2.60). |
| Cross-document consistency | Decision IDs referenced in other docs all exist in `DECISIONS.md`; collection, endpoint and route names agree across `DATABASE_SCHEMA.md`, `API_REFERENCE.md`, `ADMIN_GUIDE.md`, `ROUTE_MAP.md`; upload limit unified at 10 MB; spam handling unified (stored as `spam`, never silently dropped) |
| Invented content | None. Schema fields for leads mirror the indexed form; seeds use `[CONFIRM …]` placeholders; no metrics, prices, testimonials or client facts created |
| Implementation | None. No code, no dependencies installed, no database touched |
| External access | Not retried (per owner instruction) |

---

## Stage 02 refinements (2026-10-15)
The owner approved Stage 02 with 12 required refinements. They were applied to the documentation before any code:

| Refinement | Documented in |
|---|---|
| Cloudinary for media (plan checked against Cloudinary's billing docs: Free = 25 monthly credits) | D-018; `DATABASE_SCHEMA.md` `media`; `ARCHITECTURE.md` §8 |
| Resend for notifications behind a replaceable adapter (free tier ~3,000/month, 100/day per third-party sources; verify) | D-019 |
| Cloudflare Turnstile verified server-side (siteverify; single-use tokens, 300 s validity) | D-020; `API_REFERENCE.md` §3.8 |
| Single domain + managed MongoDB; hosting documented, not provisioned | D-021; new `DEPLOYMENT.md` |
| Logging/correlation first, external tracking optional | D-022 |
| Mandatory TOTP + recovery codes; no auth bypass via resets | D-026, D-027, D-039; `API_REFERENCE.md` §2, §4, §5.8; `ADMIN_GUIDE.md` §1, §12 |
| Canonical `www` provisional; verify DNS first | D-028; `ROUTE_MAP.md` §1; `DEPLOYMENT.md` §3 |
| Configurable careers application workflow | D-031; `settings.careers` |
| Configurable lead retention (default 365 days), secure deletion | D-032; `leads.expiresAt`; `settings.privacy` |
| Analytics deferred | D-033 |
| Legacy top-level URLs preserved (`/cms-development`, `/internet-of-things`, `/digital-marketing`) | D-038; `ROUTE_MAP.md`; `CONTENT_INVENTORY.md` proposed routes |
| Drag-and-drop ordering is drafted, previewed and published | D-037; new `orderings` collection; `API_REFERENCE.md` §5.2a |

Superseded Stage 02 items are listed at the end of `DECISIONS.md`.

---

## Stage 03: Project foundation (2026-10-15)

### 1. Inspection before changes
| Check | Result |
|---|---|
| Branch / status | `claude/amazing-sagan-mwrdn8`, up to date with origin, clean tree, no stashes |
| History | `e3a0499` → `3de0c29` (Stage 00) → `df1073b` (Stage 01) → `8b3fa9f` (Stage 02) |
| Tooling | Node v22.22.0, npm 10.9.4; Docker present; no MongoDB |
| Existing code | None (documentation only); nothing to preserve beyond `docs/` and `README.md` |

### 2. Compatibility research (npm registry)
- ESLint 10 is incompatible with `eslint-plugin-react` / `eslint-plugin-jsx-a11y` (peer ≤ 9), so **ESLint 9.39.5** was chosen.
- jsdom 30 requires Node ≥ 22.22.2 (the environment has 22.22.0), so **jsdom 29.1.1** was chosen.
- React Router 8 requires Node ≥ 22.22.0, which is satisfied. Vite 8 / Vitest 5 / plugin-react 6 / @tailwindcss/vite 4.3 peer ranges are compatible.

### 3. Implementation
Workspaces `shared/`, `server/`, `client/`; root configuration; scripts; CI. Details are in `ARCHITECTURE.md` §12 and the package list in `PROGRESS.md`.

### 4. Issues found and fixed during verification
| Issue | Fix |
|---|---|
| A request-ID test used a newline header, which Node's HTTP client refuses to send | Test uses a sendable but unsafe value instead |
| Prettier needed two passes on one file (member-chain formatting) | Re-ran; now stable |
| Client bundle 129.5 KB gzip (> 120 KB budget) because importing `@bitbyte/shared` pulled in zod | `"sideEffects": false` on `@bitbyte/shared` → 110.4 KB |
| `node --watch --env-file-if-exists=.env` **crashed** when `server/.env` was missing (watch mode tries to watch the absent file) | The server loads `server/.env` itself via `process.loadEnvFile()` when present (`src/config/envFile.js`, with tests); `SKIP_ENV_FILE=true` keeps the smoke test hermetic |
| An expected readiness 503 was logged at ERROR with a stack | Known `AppError`s log at warn/info; only unexpected errors log at error and reach the optional error-tracking hook (tested) |
| "database disconnected" was logged during failed initial connection attempts | Only logged after a successful connection |
| A `pkill -f` in a manual verification command matched its own shell | Verification re-run without it (no project impact) |

### 5. Final verification
`npm run check` → no-TS ✅ · lint ✅ · format ✅ · tests 41/41 ✅ · build ✅ · smoke 10/10 ✅. `npm run dev` manually verified with and without `server/.env` (temporary copy removed afterwards). Full results are in `PROGRESS.md`.

### 6. Not done (by scope)
Public website, homepage design, MongoDB schemas/migrations, admin authentication, CMS, production infrastructure and external service provisioning.

---

## Stage 04: Database & admin security foundation (2026-10-15)

### 1. Inspection before changes
| Check | Result |
|---|---|
| Branch / status | `claude/amazing-sagan-mwrdn8`, clean, in sync with origin (`e7a94ba`) |
| Docs read | `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_REFERENCE.md`, `ADMIN_GUIDE.md`, `DECISIONS.md`, `PROGRESS.md` |
| MongoDB availability | No local `mongod`. MongoDB download hosts blocked (`fastdl`/`downloads`/`repo.mongodb.org` → no connection). Docker Hub reachable; the Docker daemon was not running and was started manually. |

### 2. Getting a real MongoDB
- `docker pull mongo:8.0` → MongoDB **8.0.34** (Ubuntu 24.04 base, the same as the host). A disposable container (`bitbyte-mongo-dev`, host network, bound to 127.0.0.1) served as the local development database.
- `mongod` copied out of the image to `/opt/mongodb/bin/mongod` (outside the repo). All libraries resolved on the host. Used by `mongodb-memory-server` via `MONGOMS_SYSTEM_BINARY` (D-047).

### 3. Implementation (see `ARCHITECTURE.md` §12)
Shared content and auth schemas → 15 Mongoose models + `publishable` plugin → security primitives (crypto, argon2id, TOTP, recovery codes) → services (audit, sessions, auth, admins, content, public content, notifications, mailer) → middleware (origin check, session guards, rate limits) → controllers + declarative routes → CLI + seed → tests → documentation.

### 4. Issues found and fixed
| Issue | Fix |
|---|---|
| A shell command with a stray redirect emptied and deleted `server/vitest.config.js` | Recreated from the committed version plus the intended timeout settings; the diff shows only those additions |
| A Python replacement silently did not match a Prettier-reformatted `test/helpers.js` | File rewritten explicitly; later edits assert that their match exists |
| `sanitizeFilter` also neutralised the server's own `$ne`/`$gt`/`$lt`/`$in` operators (CastError) | Server-side operator objects are wrapped in `mongoose.trusted()` (D-042); a test proves injected operators from input are still neutralised |
| Mongoose 9 deprecation warning for `{ new: true }` | Replaced with `{ returnDocument: 'after' }` |
| Publish/unpublish surfaced a 500 (not 503) when the audit store failed | Wrapped like the other privileged actions; test added (D-045) |
| zod cross-field refinements run only after the base fields are valid | Shared test split into the two stages; behaviour documented in the test |
| `pkill -f` in a manual verification matched its own shell (exit 144) | Cleanup re-run without it; no project impact |

### 5. Verification
`npm run check` (with `MONGOMS_SYSTEM_BINARY`): no-TS ✅ · lint ✅ · format ✅ · tests 140/140 ✅ · build ✅ · smoke 12/12 ✅. Real-MongoDB runs: CLI (seed, admin create/rerun, production guard) and the full HTTP auth flow against a running server. Throwaway databases (`bitbyte_cli_check`, `bitbyte_e2e_check`) were dropped. Details are in `PROGRESS.md`.

### 6. Not done (by scope)
Public website, CMS write endpoints beyond the services/admin/audit routes listed, media uploads, leads, the Resend driver, the admin UI and production provisioning.

## Stage 05: CMS APIs, media, leads and SEO (2026-10-15)

### 1. Inspection before changes
| Check | Result |
|---|---|
| Branch / status | `claude/amazing-sagan-mwrdn8`, clean, in sync with origin (`069bb2d`); Stage 04 CI green |
| Docs read | `API_REFERENCE.md` §3 and §5 (the endpoint contract), `DATABASE_SCHEMA.md`, `ARCHITECTURE.md`, `ROUTE_MAP.md`, `DECISIONS.md` |
| Third-party services | No Cloudinary, Resend or Turnstile credentials were supplied. Cloudflare's `siteverify` host is not reachable from this environment. Every provider is therefore exercised through mocks; nothing was sent to a real third-party account. |

### 2. Dependencies (compatibility checked against Node 22.22 and the existing lockfile before installing)
sanitize-html 2.18.1, multer 2.4.0, file-type 22.2.0, sharp 0.35.5 (prebuilt libvips; loads on this host), cloudinary 2.11.0 (server); @vitest/coverage-v8 5.0.5 (dev, same version as vitest). `npm audit --omit=dev`: 0 vulnerabilities.

### 3. Implementation (see `ARCHITECTURE.md` §4 and §12; decisions D-049–D-058)
Shared schema factory with an injectable rich-text sanitiser → content kinds registry + content service (draft/publish/revisions/orderings/consent/delete, slug-change redirects) → resolver for public and preview views → public content service (+ cache) → taxonomy, redirect, preview and dashboard services → media pipeline (verification, sharp, local/Cloudinary/disabled storage) → leads (Turnstile, honeypot, retention dates, notifications with retries via the replaceable mailer incl. a Resend driver) → retention service, scheduler and CLI → admin route modules (97 routes) and public routes → SEO site router (HTML shell, JSON-LD, robots, sitemap, normalisation, redirects, canonical host) → tests → documentation.

### 4. Issues found and fixed
| Issue | Fix |
|---|---|
| Section data validated in `superRefine` discarded the sanitised output | Section envelope now uses a `transform` that keeps the parsed data (test added) |
| `$pull` on `published.ids` failed while an ordering had never been published (`published: null`) | Each list is updated only where it exists (`removeFromAllOrderings`) |
| `new URL('//evil.example/')` reads the path as a host, so normalisation skipped it | Paths are split by hand; tests cover `//host` and `///host//x` |
| The HTML route waited on MongoDB queries while the database was down (10 s) | It now answers 503 immediately when the connector is not up |
| Production config tests failed once `local` media was refused in production | Production defaults to a `disabled` media driver (uploads 503) instead of failing to boot (D-049) |
| Literal U+2028/U+2029/U+FEFF characters ended up in two source files from a heredoc | Replaced with escapes; all sources scanned for invisible characters |
| Local storage `remove()` hid the "invalid key" error behind a generic one | Key validated before the file operation |
| `pkill -f` during the manual run matched its own shell again (exit 144) | Processes stopped by PID; no project impact |

### 5. Verification
`npm run check` (with `MONGOMS_SYSTEM_BINARY`): no-TS ✅ · lint ✅ · format ✅ · tests 308/308 ✅ (shared 23 · server 278 · client 7) · build ✅ (110.4 KB gzip) · smoke 14/14 ✅. Coverage (`npm run test:coverage -w server`): lines ≈ 89 % services, ≈ 85 % controllers. Manual end-to-end run on a throwaway MongoDB 8.0.34 (`bitbyte_e2e`, temporary data directory deleted afterwards): 27/27 checks, from first sign-in with 2FA enrolment through settings, media upload, publishing, public API/HTML/sitemap/robots, lead submission (stored as `unverified` because Cloudflare was unreachable), CSV export, dashboard and erasure; the server log contained no personal data. The retention CLI ran in dry-run mode only. Details are in `PROGRESS.md`.

### 6. Not done (by scope or by missing input)
Visual design system and public pages (Stages 06–07), admin UI (Stage 08), verification against real Cloudinary/Resend/Turnstile accounts (credentials pending), legacy-form field verification (fields provisional), production provisioning.
