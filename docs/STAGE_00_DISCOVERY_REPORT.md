# BitByte Website Rebuild — Stage 00: Discovery & Master Planning Report

| | |
|---|---|
| **Status** | Awaiting approval. Nothing in this report has been implemented. |
| **Date** | 2026-10-15 |
| **Repository** | `robotronixindiatraining-gif/bitbyte`, branch `claude/amazing-sagan-mwrdn8` |
| **Scope** | Discovery, audit and planning only. No packages installed, no project files created besides this report, no database touched. |

## Evidence labels used throughout

Every factual statement is tagged with its source. Treat anything not tagged **[R]** or **[E]** as unverified.

| Tag | Meaning |
|---|---|
| **[R]** | Verified directly in the Git repository |
| **[E]** | Verified directly in the discovery environment (container, npm registry) |
| **[W]** | Verified by directly loading the official website. **There are none; see §0.** |
| **[S]** | Text attributed to bitbyteindia.com by search-engine indexes/snippets. Unverified, possibly stale |
| **[T]** | Third-party source (directories, LinkedIn, Clutch, MCA aggregators). Unverified |
| **[A]** | Assumption or proposal requiring confirmation |

---

## 0. Critical findings (read first)

1. **The existing project is not in the repository [R].** The GitHub repo `bitbyte` contains one commit (`e3a0499 Initial commit`, 2026-10-15) with a single file, `README.md` (`# bitbyte`, 9 bytes). There are no `client/`, `server/`, `package.json`, lockfiles, assets, tests or environment files. The previously described setup (Vite, React 19, Express 5, Mongoose 9, MongoDB at `127.0.0.1:27017`) **cannot be verified**. It either lives only on a local machine or doesn't exist yet.
2. **The official website could not be inspected directly [E].** This environment's network policy rejects connections to `www.bitbyteindia.com` (proxy `403 connect_rejected`). The web-fetch tool cannot resolve DNS for any host (control test: `example.com` also fails). So **no website content is verified [W]**. The content inventory in §2 is built from search-engine snippets and third-party profiles and needs manual confirmation.
3. **The logo and site assets could not be obtained [E].** The brand palette in §7 is provisional until the real logo files are supplied.
4. **The local MongoDB database cannot be inspected from here [E].** This cloud container has no `mongod`/`mongosh`, and `127.0.0.1:27017` here is not the user's machine. Its contents must be checked (read-only) and backed up on the user's machine before Stage 03.
5. **Company facts conflict across sources [T].** The name appears as both "Technology" and "Technologies". The founding year is given as 2016 (Clutch) and 2017 (LinkedIn, CIN). Headcounts conflict. One MCA aggregator lists the private-limited entity's status as "Strike Off". The legal entity name and status shown in the footer and in structured data must come from the business owner, not from scraped sources.

---

## 1. Current project and Git status

### 1.1 Repository [R]

| Item | Finding |
|---|---|
| Remote | `https://github.com/robotronixindiatraining-gif/bitbyte` |
| Branches | `main` (default) and `claude/amazing-sagan-mwrdn8`, both at `e3a0499` |
| History | 1 commit, author `robotronixindiatraining-gif`, 2026-10-15 |
| Working tree | Clean. **No uncommitted work exists in this clone.** |
| Files | `README.md` only, containing `# bitbyte` |
| Missing | `.gitignore`, `LICENSE`, `package.json`, any source, any config, any tests, any assets, `.env.example`, CI workflows |

### 1.2 Environment [E]

| Item | Finding |
|---|---|
| Node.js / npm | v22.22.0 / 10.9.4 |
| MongoDB | Not installed in this container |
| npm registry | Reachable (used for version research only; nothing installed) |
| Official website | Blocked by network policy |

### 1.3 Uncommitted local work — action required

If the earlier Vite/React/Express project exists on a local machine, it must be preserved before anything else:

```bash
# On the machine holding the old project. Read-only inspection first.
git status && git log --oneline -20        # if it is a git repo
cat package.json client/package.json server/package.json 2>/dev/null
# Then push it to a SEPARATE branch so nothing in the new plan overwrites it:
git checkout -b legacy/local-snapshot && git add -A && git commit -m "Snapshot of pre-rebuild local project"
git remote add origin https://github.com/robotronixindiatraining-gif/bitbyte.git   # if needed
git push -u origin legacy/local-snapshot
```

Do **not** commit `.env` files or `node_modules` in that snapshot.

### 1.4 Dependency verification (registry snapshot, 2026-10-15) [E]

The claimed majors match the current stable lines: `react@19.3.1`, `express@5.3.0`, `mongoose@9.11.2`. Other relevant current versions: `vite@8.3.4` (Node ^20.19 / ≥22.12), `tailwindcss@4.3.3`, `react-router@8.4.0` (**requires Node ≥22.22.0**). The exact versions in the local project are unknown until it is pushed.

---

## 2. Website route and content inventory

> **No item below is verified [W].** Every row needs manual confirmation against the live site, or a content export, in Stage 01.

### 2.1 Domains and routes

| URL | Source | Indexed title / notes | Status |
|---|---|---|---|
| `https://bitbyteindia.com/` and `https://www.bitbyteindia.com/` | [S] | "IT Services and IT Business Solution Company" | Exists in index; canonical host (www vs apex) unknown |
| `/careers/` | [S] | Same title as home. **The same `<title>` on every page suggests weak per-page SEO.** | Exists in index |
| `/cms-development` | [S] | Same title; contains the company tagline and contact block | Exists in index. Shows that service pages exist as top-level slugs |
| Menu items (seen on careers page): Web Development, Internet of Things, Mobile App Development, CMS Solutions, Digital Marketing, Portfolio | [S] | Implies at least 5 service pages plus a portfolio page | Exact URLs unknown |
| Services mentioned elsewhere: Logo Design, CMS, SEO, E-commerce websites | [S] | | Unknown whether these are separate pages |
| `https://training.bitbyteindia.com/` | [S] | "Development"; lists Core/Advanced Java, Python, PHP/MySQL, "ML, DL and AI" | **Separate training subdomain. Scope decision needed (Q3).** |
| `training.bitbyteindia.com/about/` | [S] | "About" | Exists in index |
| `training.bitbyteindia.com/industrial-training/` | [S] | 45-day industrial training/internship for BCA, MCA, B.Tech, M.Sc students; certificate after a professional exam; daily, alternate-day and weekend batches; live projects | Exists in index |
| `robots.txt`, `sitemap.xml` | — | Could not be fetched | Unknown |
| Home, About, Contact, Portfolio detail, Privacy, Terms | — | Not in index results | **Unknown. Require direct inspection.** |

### 2.2 Company information

| Field | Value | Source | Confidence |
|---|---|---|---|
| Trading name | "BitByte Software Technologies" (site copy) / "BitByte Software Technology" (brief, directories) | [S]/[T] | **Conflict: confirm the exact public name (Q1)** |
| Tagline / intro | "BitByte Software Technologies located in Indore, with capabilities to service clients across M.P. is a rapidly growing Website Design, Development and Custom Software Development company." | [S] | Medium (verbatim snippet). Copy needs editing for the rebuild. |
| Address | 402, 4th Floor, Atulya IT Park, MPIDC, Khandwa Road, Indore (M.P.) 452001 | [S] | Medium |
| Landmark | Opposite Indian Coffee House, Bhanvarkuan | [T] | Low |
| Phones | 0731-2970998; +91-9993150998 | [S] | Medium. Confirm which numbers are current and which carry WhatsApp. |
| Emails | info@bitbyteindia.com; indiabitbyte@gmail.com | [S] | Medium. Recommend showing only the domain address publicly. |
| Hours | Closed Sunday | [T] | Low |
| Founded | 2016 (Clutch, The Manifest) / 2017 (LinkedIn; CIN U74999**MP2017**PTC042630) | [T] | **Conflict (Q1)** |
| Legal entity | BITBYTE SOFTWARE TECHNOLOGY PRIVATE LIMITED, status listed as "Strike Off" on Zauba Corp | [T] | **Must be confirmed by the owner before a legal name appears anywhere (Q1)** |
| Team size | 1–10 (ZoomInfo), 2–10 (LinkedIn), 11 (Tracxn), 10–49 (Clutch) | [T] | Do not publish without confirmation |
| Tech focus | Python/ML/AI/DS, React/Node/Mongo/Express, Java, Flutter, WordPress | [T] (Instagram bio, Clutch) | Medium |
| Social | Instagram `@bitbyteindia`; LinkedIn company page `bitbyte-software-technology` | [T] | Confirm URLs and any Facebook, X or YouTube accounts |
| Ratings | 4.8/5 from 105 reviews (Yappe directory) | [T] | **Not for republication** without the reviewers' or platform's permission |

### 2.3 Content sections — status

| Section | What is known | What is missing |
|---|---|---|
| Services | Names only (§2.1) | Descriptions, deliverables, process, tech stack, images, FAQs |
| Portfolio | A menu item exists | **Entire content:** projects, clients, images, permission to show client names/logos |
| Testimonials | Nothing on the official site is known | Quotes, names, consent. Directory reviews don't count. |
| Pricing | Nothing known | **No evidence the current site publishes pricing (Q5)** |
| Careers | Page exists; copy stresses technical training and certifications | Current openings, application process |
| Training / internships | Courses and the 45-day programme (§2.1) | Fees, syllabus, batch dates, certificate details, scope decision |
| Contact form | Contact details only | Form fields, where submissions go today (email? DB?) |
| Footer | Contact block | Links, legal pages, copyright entity |
| Metadata | Generic site-wide title | Descriptions, OG images, analytics IDs, Search Console ownership |
| Blog / news | No evidence | Not planned unless requested (§5.3) |

### 2.4 How to complete the inventory in Stage 01 (needs the user)

Pick one:
- **(a)** Allow `bitbyteindia.com`, `www.bitbyteindia.com` and `training.bitbyteindia.com` in this environment's network settings. I then crawl every page and download the assets into a non-served `legacy/` folder.
- **(b)** Supply a site export: hosting backup, WordPress export, or the original source.
- **(c)** Supply saved HTML pages, screenshots and the asset folder manually.

A Google Search Console export of indexed URLs is also needed for the redirect map (§8.3).

---

## 3. Asset and logo audit

| Asset | Status |
|---|---|
| Logo (any format) | **Not obtained.** Need the master vector (SVG/AI/EPS/PDF) and a transparent PNG, plus any light/dark variants. |
| Favicon / app icons | Not obtained. Will be generated from the vector logo. |
| Brand colours / typeface | Unknown. To be extracted from the vector logo. |
| Photography (office, team) | Unknown. Licence status unknown. |
| Portfolio screenshots | Unknown. Need client permission. |
| Client logos | Unknown. Need client permission. |
| Fonts | Unknown. The new design uses self-hosted open-licence fonts regardless (§7.3). |
| Documents (brochures, certificates) | Unknown |
| Broken/inaccessible pages | Cannot be determined without access (§2.4) |

**Asset rules for the rebuild [A]:**
- Legacy assets go into `legacy/assets/` (outside served paths), are catalogued in `CONTENT_INVENTORY.md`, and are imported via the media library only after review.
- Stock imagery is used only when licensed, and recorded with its licence.
- Every image needs alt text, or an explicit "decorative" flag, before it can be published.

---

## 4. Proposed architecture and repository structure

### 4.1 Principles
- **A single deployable Node service.** Express serves `/api/v1/*` and the built React app from the same origin. This allows same-site cookies, needs no CORS in production, and keeps hosting simple. In development, the Vite dev server proxies `/api` to Express.
- **npm workspaces** for `client`, `server` and `shared`. One root lockfile gives reproducible installs.
- **`shared/` exists for one reason:** the section-type and entity validation schemas (zod) are used by both the admin forms (client) and the API validation (server), so they can never drift apart.
- JavaScript (ESM) only. No TypeScript. JSDoc where it helps the editor.

### 4.2 Repository layout (proposal)

```
bitbyte/
├─ client/                         # React + Vite + Tailwind
│  ├─ index.html
│  ├─ vite.config.js
│  ├─ public/                      # favicons, static robots fallback
│  └─ src/
│     ├─ main.jsx
│     ├─ app/                      # router, providers (QueryClient), App shell, error boundary
│     ├─ layouts/                  # PublicLayout, AdminLayout, AuthLayout
│     ├─ components/
│     │  ├─ ui/                    # design primitives: Button, Container, Section, Heading, Text,
│     │  │                         #   Card, Badge, Input, Select, Textarea, Dialog, Toast, Skeleton…
│     │  ├─ media/                 # ResponsiveImage, Logo
│     │  └─ motion/                # Reveal, useInView, motion presets (reduced-motion aware)
│     ├─ sections/                 # public section renderers, keyed by section type
│     │  ├─ registry.js            # type → { Component, AdminForm (lazy) }
│     │  └─ Hero/, ServiceGrid/, ProjectShowcase/, Stats/, Testimonials/, CtaBanner/, Faq/ …
│     ├─ features/                 # domain modules (api hooks + components)
│     │  ├─ services/  projects/  testimonials/  pricing/  careers/  training/  contact/
│     │  └─ admin/                 # auth, dashboard, pages-builder, media-library, leads, users, settings
│     ├─ pages/                    # route-level components only (thin)
│     ├─ services/api/             # apiClient.js (fetch wrapper, error normalisation) + per-resource modules
│     ├─ hooks/  lib/  utils/
│     └─ styles/index.css          # Tailwind v4 entry; design tokens in @theme
├─ server/
│  ├─ src/
│  │  ├─ server.js                 # boot: config → db → app.listen, graceful shutdown
│  │  ├─ app.js                    # express app factory (testable)
│  │  ├─ config/                   # env.js (zod-validated env), db.js, logger.js, constants
│  │  ├─ routes/                   # public/, admin/, auth.routes.js, index.js (mounts /api/v1)
│  │  ├─ controllers/              # HTTP in/out only
│  │  ├─ services/                 # business logic (publish, revisions, media, leads, mail)
│  │  ├─ models/                   # Mongoose schemas
│  │  ├─ validators/               # request schemas (import shared/ schemas)
│  │  ├─ middleware/               # authenticate, authorize, validate, rateLimits, originCheck,
│  │  │                            #   upload, notFound, errorHandler, requestId
│  │  ├─ storage/                  # media storage adapters: local.js, cloudinary.js (or s3.js)
│  │  ├─ seo/                      # sitemap, robots, meta injection for index.html
│  │  └─ utils/                    # AppError, pick, slug, pagination
│  ├─ scripts/                     # create-admin.js, seed.js, export-content.js (non-destructive by default)
│  └─ tests/                       # integration (supertest + in-memory Mongo), unit
├─ shared/
│  └─ src/                         # section schemas, enums (roles, lead statuses, section types), slug rules
├─ e2e/                            # Playwright tests (public + admin smoke, axe checks)
├─ legacy/                         # captured original site + assets (not served; reference only)
├─ docs/                           # see §13
├─ scripts/                        # repo-level helpers (e.g. check-no-typescript.js)
├─ .github/workflows/ci.yml
├─ .editorconfig  .gitignore  .nvmrc  .prettierrc  eslint.config.js
├─ package.json                    # workspaces + root scripts (dev, build, lint, test, format)
└─ README.md
```

### 4.3 Request flow and layers (server)
`route → validate(schema) → authenticate → authorize(role) → controller → service → model`. Express 5 forwards rejected promises to the central `errorHandler`, so no async wrapper is needed. Controllers never touch Mongoose directly for writes that involve publishing. Those go through services so revisions and audit entries are always written.

### 4.4 Rendering strategy and SEO — decision required (Q8)

| Option | SEO | Social previews | Complexity |
|---|---|---|---|
| A. Client-rendered SPA only | Google renders JS; other engines are weaker | Broken (no per-page OG) | Low |
| **B. SPA + server-side meta injection (recommended)** | Good: per-route `<title>`, description, canonical, OG and JSON-LD injected into `index.html` by Express from published data; content rendered client-side | Correct | Low–medium |
| C. Full SSR (React Router framework mode) | Best | Correct | Higher: SSR server, hydration constraints, data loaders |

**Recommendation: B** for launch, with section components written to be SSR-safe (no `window` access at module scope) so we can move to C later without a rewrite.

### 4.5 Media storage — decision required (Q9)
The upload pipeline is the same whichever store is chosen: multer (memory, size-limited) → magic-byte check with `file-type` → `sharp` re-encode (strips EXIF/GPS, normalises orientation, produces WebP/AVIF variants at fixed widths) → storage adapter → `media` document holding the metadata and URLs. **Binaries never go into MongoDB.**

| Store | Pros | Cons |
|---|---|---|
| Local disk (`server/uploads`) | No external account | Needs persistent disk and backups; no CDN; ties the app to one server |
| **Cloudinary (recommended for production)** | CDN, on-the-fly resizing, free tier fits a company site | External account; vendor URLs |
| S3-compatible (Cloudflare R2 / AWS S3) | Cheap, portable | We generate variants ourselves; more setup |

Use local disk in development and the chosen driver in production, behind one adapter interface.

---

## 5. MongoDB collections and relationships

### 5.1 Content model: hybrid with dual-state publishing
- **Dedicated collections** for reusable business entities (services, projects, testimonials …).
- **Pages are made of ordered sections**, and each section type comes from an approved registry with a strict schema.
- **Dual-state documents:** every publishable document stores `draft` and `published` sub-documents. Admins edit `draft`. **Publish** validates it, copies it to `published`, sets `publishedAt`, writes a `revisions` snapshot and an `auditLogs` entry. Public APIs read only `published`. A live item can therefore be edited safely without exposing half-finished changes. Preview renders `draft` with the public components.
- **Optimistic concurrency:** each save sends the document's `revision` number. A stale save returns `409 Conflict`, so two admins can't silently overwrite each other.

Common publishable fields: `status` (`draft` | `published` | `archived`), `hasUnpublishedChanges`, `draft{}`, `published{}`, `publishedAt`, `publishedBy`, `revision`, `createdBy`, `updatedBy`, timestamps. Ordering uses an `order` number.

### 5.2 Collections

| Collection | Purpose / key fields | Relationships | Justification |
|---|---|---|---|
| `users` | name, email (unique, lowercased), passwordHash (argon2id), role, status (`active`/`disabled`), failedLoginCount, lockUntil, lastLoginAt, passwordChangedAt | → sessions, auditLogs | Admin accounts |
| `sessions` | tokenHash (SHA-256 of an opaque random token), userId, ip, userAgent, createdAt, lastSeenAt, expiresAt (TTL index) | → users | Revocable server-side sessions (§8.1) |
| `settings` | One document per `key`: `general` (names, tagline, logos), `contact` (phones, emails, address, hours, map, WhatsApp), `navigation` (header items, CTA), `footer` (columns, legal line), `social`, `seoDefaults` (title template, default OG image, org JSON-LD), `integrations` (analytics IDs, public site keys only, never secrets). Dual-state. | nav items may reference pages/services by id | Global site settings, published independently per area |
| `pages` | slug (unique), template (`home`, `about`, `services-index`, `portfolio-index`, `contact`, `careers`, `training`, `legal`, `generic`), draft/published `{ title, sections[], seo }` | sections reference services/projects/testimonials/media by id | Section-based pages |
| ↳ `sections[]` (embedded) | `{ _id, type, variant, visible, anchorId, data }`. `type` and `variant` come from the shared registry; `data` is validated by that type's schema | | Reordering and visibility per section |
| `services` | slug, title, summary, icon, heroImage, body (sanitised rich text), highlights[], process[], technologies[] (→ techTags), faqs[], featured, order, seo | → techTags, projects, media | Service listing and detail pages |
| `projects` | slug, title, client `{ name, showName }`, category (→ projectCategories), services[] (→ services), technologies[] (→ techTags), summary, challenge, solution, results[], cover, gallery[], liveUrl, year, featured, order, seo | → categories, techTags, services, media | Portfolio |
| `projectCategories` | name, slug, order | ← projects | Portfolio filters |
| `techTags` | name, slug, icon (optional) | ← projects, services | Technology tags shared across entities |
| `testimonials` | authorName, authorRole, company, quote, photo, project (optional →), **consent `{ confirmed, date, note }` (required to publish)**, featured, order | → projects, media | Verified testimonials only |
| `pricingPlans` | name, description, priceType (`fixed` / `starting_at` / `quote`), amount, currency (INR), period, features[], highlighted, cta, service (→), order | → services | **Only if pricing is approved (Q5)**; the module can ship hidden |
| `jobOpenings` | slug, title, department, location, employmentType, experience, description, requirements[], applyMethod (email / form), closesAt | | The careers page exists. Enables `JobPosting` structured data. |
| `trainingPrograms` | slug, title, duration, eligibility[], modes[] (daily / alternate / weekend), syllabus[], certificate, fee (optional), batches[] | | **Only if training is merged into the main site (Q3)** |
| `media` | driver, storageKey/publicId, url, variants[{ width, format, url }], mimeType, bytes, width, height, **alt**, decorative, caption, credit/licence, folder, tags, checksum (dedupe), uploadedBy | ← all content | Media library metadata |
| `leads` | type (`contact` / `project` / `career` / `training`), name, email, phone, company, message, serviceInterest, budgetRange, sourcePath, utm{}, consent `{ given, text, at }`, status (`new` / `contacted` / `qualified` / `won` / `lost` / `spam` / `closed`), notes[{ by, text, at }], assignedTo, ipHash, userAgent | → users | Contact submissions and pipeline |
| `redirects` | from (path), to, statusCode (301/302), hits, enabled | | Preserves legacy URLs and slug changes; critical for SEO continuity |
| `revisions` | entityType, entityId, revision, snapshot, publishedBy, publishedAt | → any publishable | Rollback; keep the last N (e.g. 20) per entity |
| `auditLogs` | actor, action (`login`, `publish`, `delete`, `role_change`, `lead_status` …), entityType, entityId, summary, ip, at (TTL for retention) | → users | Accountability |

**Not proposed:** `blogPosts` (no evidence of a blog on the current site), `teamMembers` (team size unconfirmed, add only if wanted), and storing pages as free-form HTML.

### 5.3 Indexes (initial)
Unique `slug` on every slugged collection. `{ status, order }` on listings. `leads { status, createdAt }`. `sessions.expiresAt` TTL. `auditLogs.at` TTL. Unique `redirects.from`. Unique `users.email`.

### 5.4 Existing local data (unknown)
Before Stage 03, on the user's machine, read-only:
```bash
mongosh --quiet --eval 'db.adminCommand({ listDatabases: 1 })'
mongodump --uri="mongodb://127.0.0.1:27017" --out="bitbyte-backup-$(date +%F)"
```
Then decide per collection: **retain/migrate** (map it into the new schema with an idempotent script), **re-seed** (from `CONTENT_INVENTORY.md`), or **discard** (only with explicit approval, after the backup). No reset, drop or overwrite happens without written approval.

---

## 6. Admin roles, features and publishing workflow

### 6.1 Roles and permissions (server-enforced)

| Capability | super_admin | admin | editor |
|---|:-:|:-:|:-:|
| Create/edit drafts (pages, services, projects, testimonials, pricing, careers, training) | ✓ | ✓ | ✓ |
| Preview drafts | ✓ | ✓ | ✓ |
| Publish / unpublish / restore revision | ✓ | ✓ | — (marks "ready for review") |
| Delete / archive content | ✓ | ✓ | — |
| Media upload / edit alt text | ✓ | ✓ | ✓ |
| Media delete (blocked while referenced) | ✓ | ✓ | — |
| Settings: company, contact, navigation, footer, social, SEO defaults | ✓ | ✓ | — |
| Leads: view, update status, add notes | ✓ | ✓ | — |
| Leads: export CSV / permanently erase | ✓ | export only | — |
| Redirects | ✓ | ✓ | — |
| Users and roles, audit log | ✓ | audit read-only | — |

Every admin route checks `authenticate` and then `authorize(capability)` on the server. Hiding routes in the React UI is cosmetic only.

### 6.2 Admin features
- **Dashboard:** new leads, items with unpublished changes, recent activity.
- **Pages builder:** add, remove, reorder (accessible move up/down buttons, plus drag-and-drop), hide/show and edit sections of **approved types only**. Each section type has a purpose-built form and a small set of variants (e.g. background `default | muted | dark`, image left/right). **No arbitrary HTML, CSS, colours or fonts.** This keeps the design consistent.
- **Entity managers:** services, projects (with categories, tech tags and gallery), testimonials (consent required to publish), pricing, careers, training.
- **Global settings:** company info, contact, navigation, footer, social, SEO defaults.
- **SEO panel on every page/entity:** title, description, canonical override, OG image, noindex. Live length counters and a search-result preview.
- **Media library:** upload, search, folders/tags, alt text, decorative flag, usage view, safe delete.
- **Leads inbox:** filters, status pipeline, notes, assignment, CSV export, erase.
- **Users:** invite/create, role change, disable, force sign-out, reset password.
- **Audit log** viewer and **redirect** manager.

### 6.3 Publishing workflow
```
           save (revision check)          publish (admin+)
 [draft] ───────────────────────▶ [draft*] ───────────────▶ [published]
    ▲                               │ preview                    │ edit → hasUnpublishedChanges
    │                               ▼                            ▼
    └───── restore revision ◀── revisions ◀──── snapshot   [published + draft*]
                                                   unpublish/archive ─▶ [archived]
```
- **Preview:** `/admin/preview/:entity/:id` renders the draft through the same public section components, with a visible "Preview, not published" bar and `noindex`.
- Publishing a page whose sections reference unpublished entities is blocked, with a clear message.
- Scheduled publishing is out of scope for launch [A].

---

## 7. Design direction

### 7.1 Positioning
A premium, modern B2B technology studio: confident, precise, calm. Present the company's breadth (web, mobile, custom software, IoT, AI/ML, CMS, digital marketing) as considered engineering, not a template catalogue. The current website's content is the source material; its design is not reused.

### 7.2 Brand palette: provisional until the logo is supplied [A]
The palette below follows the brief: deep navy, white and light neutrals, with a restrained electric-blue accent. Once the vector logo arrives, the accent hue (and a secondary hue, if the logo has one) will be sampled from it and contrast-checked. The tokens will change; the structure won't.

| Token | Hex | Use |
|---|---|---|
| `navy-950` | `#070F24` | Dark sections, footer |
| `navy-900` | `#0B1A3A` | Headings on light backgrounds, hero background |
| `navy-800` | `#12275A` | Elevated dark surfaces |
| `accent-600` | `#1F55E0` | Primary buttons, links (white text ≈ 6.1:1, AA) |
| `accent-500` | `#2F6BFF` | Highlights and focus rings on dark (≈ 4.5:1 with white; **not** for small text on white) |
| `accent-100` | `#E6EEFF` | Tinted backgrounds, badges |
| `neutral-0` | `#FFFFFF` | Base surface |
| `neutral-50` | `#F7F8FB` | Alternate section background |
| `neutral-200` | `#DDE3EC` | Borders |
| `neutral-500` | `#64708A` | Secondary text (large text / meta only) |
| `neutral-700` | `#374156` | Body text on white |
| `success` / `warning` / `danger` | `#12A150` / `#B87503` / `#D23434` | Form and admin states |

Rules: one accent colour per view. No rainbow gradients. Gradients only as subtle navy-to-navy depth or a faint accent glow behind the hero visual. Every text/background pair is checked against WCAG AA.

### 7.3 Typography
- **Headings:** *Plus Jakarta Sans Variable*, a geometric, contemporary face with a premium B2B feel.
- **Body/UI:** *Inter Variable*, highly legible at small sizes and in the admin UI.
- **Accent/mono (sparing):** *JetBrains Mono* for eyebrow labels and tech tags.
- Self-hosted via `@fontsource-variable/*`: no third-party font requests, latin subset, `font-display: swap`, and only the primary weights preloaded.
- Fluid type scale with `clamp()` from 16px body up to a ~64–72px hero display. Line length 60–75 characters. Generous vertical rhythm on an 8px spacing scale.

### 7.4 Key compositions (proposals for the Stage 02 design review)
- **Hero:** navy canvas, large confident headline with one accented phrase, short value line, primary and secondary CTA. A distinctive abstract "bit/byte" visual: a fine grid of glyph cells that light up subtly (static SVG; a gentle one-time intro animation; nothing looping). Trust strip below it (years, projects, technologies), shown only with verified numbers.
- **Services:** an asymmetric bento grid with an icon, a one-line outcome and a hover reveal of key technologies. Detail pages: outcome-led hero, "what we deliver", process timeline, tech stack, related projects, FAQ, CTA.
- **Portfolio:** large-image case-study cards, filters by category and technology with animated re-layout, and case-study pages structured as challenge → solution → results.
- **Testimonials:** a static editorial quote layout (no auto-advancing carousel).
- **Contact:** a two-column form plus office card with map (loaded on interaction), a WhatsApp link if confirmed, and response-time copy.
- **Mobile:** a full-screen accessible menu, sticky compact header, thumb-reachable CTAs, and single-column narrative layouts that are designed for mobile rather than just stacked.

### 7.5 Motion principles
- **Purposeful:** motion explains a change (filtering, navigation, disclosure) or adds a single moment of polish (hero intro, section reveal).
- **Only `transform` and `opacity` are animated.** Reveals run once per element when ~20% is visible: 400–600 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, 8–16px rise, small stagger. Micro-interactions take 150–200 ms.
- **`prefers-reduced-motion: reduce`** disables reveals and parallax, and swaps transitions for instant state changes.
- No scroll-jacking, no looping background animation, no cursor followers, nothing that delays content or hurts LCP or INP.
- Implementation: CSS transitions plus a small `useInView` (IntersectionObserver) hook for reveals. Add the `motion` library only for portfolio filter layout animations and route transitions (lazy-loaded `LazyMotion` features), if Stage 02 confirms those interactions.

---

## 8. Security, accessibility, SEO and performance requirements

### 8.1 Security (baseline: OWASP ASVS Level 1, plus selected Level 2 controls for auth)
- **Authentication:** email + password. Hashing with **argon2id** (OWASP-recommended parameters). Generic login errors. Login rate limits per IP and per account (e.g. 5 attempts per 15 minutes), plus progressive lockout.
- **Sessions:** an opaque 256-bit random token in a cookie that is `HttpOnly; Secure; SameSite=Strict; Path=/`. Only its hash is stored server-side, with idle (2 h) and absolute (12 h) expiry. Rotated on login. Revoked on logout, password change or disable. This is chosen over JWTs because it can be revoked and avoids token-storage pitfalls.
- **CSRF:** SameSite=Strict, plus an `Origin`/`Referer` allowlist check on all state-changing requests, plus JSON-only bodies. No extra CSRF dependency is needed.
- **Authorisation:** a capability check on every admin route (§6.1). Integration tests confirm editors get `403` on publish/delete/users.
- **Input:** strict zod schemas (unknown keys rejected) on body, params and query. Explicit field picking (no mass assignment). Mongoose `sanitizeFilter` against operator injection (`express-mongo-sanitize` is **not** compatible with Express 5's read-only `req.query`).
- **Rich text:** sanitised server-side on write with an allowlist (`sanitize-html`). React renders all other content as escaped text.
- **Uploads:** size cap (e.g. 8 MB), MIME allowlist (JPEG, PNG, WebP, AVIF) checked by magic bytes, `sharp` re-encode, random storage keys, **SVG uploads disabled** (XSS vector; the logo SVG is added by a developer and reviewed), and no execution of uploaded files.
- **HTTP hardening:** `helmet` with a strict Content-Security-Policy (no inline scripts), HSTS, `frame-ancestors 'none'`, Referrer-Policy and Permissions-Policy. `trust proxy` set correctly behind the reverse proxy so rate limits see real client IPs.
- **Lead form:** honeypot field, rate limit, length limits. Optional Cloudflare Turnstile if spam appears. Emails escape all user content.
- **Secrets:** environment variables only, validated at boot. `.env` stays git-ignored and `.env.example` is committed. Least-privilege MongoDB user in production.
- **Errors and logging:** no stack traces in production responses. Structured logs with request IDs, with passwords, cookies and tokens redacted.
- **Supply chain:** committed lockfile, `npm ci` in CI, `npm audit --omit=dev --audit-level=high` gate, Dependabot.
- **Audit log** for logins, publishing, deletions, role changes, lead exports and erasures.
- **Privacy:** lead data falls under India's **DPDP Act 2023**. This needs a consent notice on forms, a privacy policy, a defined retention period (Q11) and an erasure capability.

### 8.2 Accessibility (target: WCAG 2.2 AA)
Semantic landmarks and heading order, a skip link, visible focus (2px accent ring), and full keyboard support for the menu, dialogs, filters and admin builder. Accessible form labels, error summaries and `aria-live` announcements. AA colour contrast. Targets at least 24×24 px. Alt text is enforced at publish. Reduced-motion support. No content that only works on hover. Automated checks run axe in Playwright, plus a manual keyboard and screen-reader (NVDA/VoiceOver) pass before launch.

### 8.3 SEO
Unique title, description and canonical per page (editable). Open Graph and Twitter cards. JSON-LD for `Organization`/`LocalBusiness` (name, address and phone consistent with Google Business Profile), `Service`, `BreadcrumbList` and `JobPosting`. `sitemap.xml` generated from published content. `robots.txt` with `noindex` on admin and preview. Clean slugs. **A 301 redirect map from every legacy URL** (e.g. `/cms-development` → `/services/cms-development`). Search Console verification and a sitemap submitted at launch.

### 8.4 Performance budgets (mobile, Lighthouse on 4G throttling)
- Lighthouse ≥ 90 for Performance, Accessibility, Best Practices and SEO.
- **LCP < 2.5 s, CLS < 0.1, INP < 200 ms.**
- Public JS ≤ ~120 KB gzipped on first load. The admin bundle is split off and lazy-loaded, so the public site never downloads the editor.
- Responsive `srcset` with AVIF/WebP. Explicit width/height. The LCP image is preloaded and the rest lazy-loaded.
- Fonts: 2 preloaded subsets.
- API: `Cache-Control` plus ETag on public GETs, `.lean()` queries and projections. The cache is invalidated on publish.

### 8.5 Responsive design
Mobile-first breakpoints: 360, 640, 768, 1024, 1280, 1536. Tested on real iOS Safari and Android Chrome plus the current desktop browsers. The admin panel must work on a tablet; on a phone it must support at least reading and updating leads.

### 8.6 Deployment requirements (decision Q10)
Node ≥ 22.22 LTS (or 24 LTS), MongoDB (Atlas, Mumbai region, recommended), HTTPS, automated daily DB backups with a tested restore, media backups (if self-hosted), uptime monitoring, error tracking (optional, e.g. Sentry), and SMTP/transactional email for lead notifications. Candidate hosts: a VPS (Nginx + PM2/systemd) or a managed Node PaaS. The choice depends on budget and who maintains it.

---

## 9. Recommended dependencies (to be installed from Stage 03; nothing installed now)

Versions are the current stable releases as of 2026-10-15 [E]. They will be pinned via the lockfile when installed. If the local legacy project proves to use different working versions, we keep those unless there's a reason to change.

### 9.1 Client
| Package | Reason | Alternatives considered |
|---|---|---|
| `react`, `react-dom` 19 | Required stack. React 19 also has built-in `<title>`/`<meta>` hoisting. | — |
| `vite` 8, `@vitejs/plugin-react` | Required build tool | — |
| `tailwindcss` 4, `@tailwindcss/vite` | Required styling. v4 `@theme` holds the design tokens as CSS variables. | — |
| `react-router` 8 (library/data mode) | Routing, nested layouts, lazy routes. **Needs Node ≥ 22.22.0.** | v7 if the team's Node can't be upgraded |
| `@tanstack/react-query` | Server-state caching, mutations and invalidation for the admin; removes hand-written loading/error state | Plain fetch + hooks: too much custom code for the admin |
| `react-hook-form` + `@hookform/resolvers` | Performant, accessible forms (builder, lead form) | Formik: heavier and less maintained |
| `zod` (via `shared/`) | One schema for client and server validation | Joi/yup: zod works on both sides in JS |
| `lucide-react` | Consistent, tree-shakable icon set | Heroicons: smaller set |
| `@fontsource-variable/inter`, `…/plus-jakarta-sans`, `…/jetbrains-mono` | Self-hosted fonts (privacy, performance) | Google Fonts CDN: third-party requests |
| `@tiptap/react` + `@tiptap/starter-kit` (admin only, lazy) | Limited-schema WYSIWYG for service/project body text | Markdown textarea: hard for non-technical admins |
| `@dnd-kit/core` + `@dnd-kit/sortable` (admin only) | Drag reordering of sections and items, with keyboard sensors. Up/down buttons remain as the accessible baseline. Note: last published Dec 2024; the newer `@dnd-kit/react` is still 0.x. | Buttons only |
| `motion` (conditional, §7.5) | Layout animations for portfolio filters and route transitions | CSS only, if those interactions are dropped |
| `clsx` | Conditional class names in primitives (tiny) | Hand-written `cn()` |

### 9.2 Server
| Package | Reason | Notes |
|---|---|---|
| `express` 5 | Required. Native async error propagation. | — |
| `mongoose` 9 | Required. Schemas, validation, `sanitizeFilter`. | — |
| `zod` | Request and env validation (shared schemas) | — |
| `helmet` | Security headers and CSP | — |
| `express-rate-limit` | Login, lead form and upload limits | The in-memory store is fine for a single instance; a Mongo/Redis store is needed if scaled out |
| `argon2` | argon2id password hashing (prebuilt native binaries) | `bcrypt` as a fallback if native builds fail on the host |
| `cookie-parser` | Session cookie parsing (Express 5 doesn't parse cookies) | — |
| `multer` 2 | Multipart upload handling with limits | — |
| `file-type` | Magic-byte MIME verification (ESM, Node ≥ 22) | — |
| `sharp` | Re-encode, strip metadata, generate variants | Native dependency; prebuilt for Linux/macOS/Windows |
| `sanitize-html` | Server-side rich-text allowlist (Node ≥ 22.12) | `isomorphic-dompurify` rejected: needs Node ≥ 22.22.2 and pulls in jsdom |
| `pino` + `pino-http` | Fast structured logging with redaction | — |
| `nodemailer` | Lead notification emails via the chosen SMTP | Depends on Q12 |
| `cloudinary` *or* `@aws-sdk/client-s3` | Production media driver | Depends on Q9; only one gets installed |
| **Not needed:** `cors` (same origin + Vite proxy), `jsonwebtoken` (opaque sessions), `express-mongo-sanitize` (incompatible with Express 5), `csrf-csrf` (SameSite + Origin check) | | |

### 9.3 Tooling and testing (dev)
`eslint` (flat config) + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y`; `prettier`; `vitest` + `@testing-library/react` + `jsdom` (client unit/component tests); `supertest` + `mongodb-memory-server` (API integration tests; the mongod binary download must be allowed or cached in CI); `@playwright/test` + `@axe-core/playwright` (end-to-end and accessibility; Chromium is pre-installed here); `concurrently` (run client and server in dev). A repo script fails CI if any `.ts`/`.tsx` file or TypeScript config appears.

---

## 10. Stage plan

Stage 03 is "Project Foundation", which matches the dependency policy.

| # | Stage | Scope | Deliverables | Depends on | Tests / verification | Acceptance criteria |
|---|---|---|---|---|---|---|
| 00 | Discovery & planning | Audit repo, site, assets, data; architecture; plan | This report | — | — | **User approves the plan and answers the blocking questions** |
| 01 | Source recovery, content capture & docs baseline | Recover legacy project (if any) to `legacy/local-snapshot`; DB inventory and backup; full crawl or export of the old site; collect logo and assets; verify company facts; write all docs from §13; record ADRs | `legacy/` capture, completed `CONTENT_INVENTORY.md` (every item verified or flagged), `docs/*` baseline, `DECISIONS.md` ADR-001…, URL list for redirects | Approval; network access or export (§2.4); owner answers | Docs reviewed; link check on the captured inventory | Inventory signed off by the owner; no unresolved blockers for design |
| 02 | Design system & UX | IA/sitemap, wireframes (mobile + desktop) for key templates, palette from the real logo, type scale, component and section catalogue, motion spec, admin UX flows | `DESIGN_SYSTEM.md`, wireframes/mock-ups (shared as images or a design artifact), section registry spec | 01 (logo, content) | Contrast checks on all token pairs | Owner approves the visual direction and the section list |
| 03 | Project foundation | npm workspaces; client/server/shared skeletons; Tailwind v4 tokens; env validation; logger; error contract; health endpoint; Vite proxy; ESLint/Prettier; Vitest/Supertest/Playwright setup; CI; no-TS guard | Running skeleton, CI green, updated README | 02 (tokens), Q10 Node version | Lint, unit, `/api/v1/health` integration test, client build, CI | `npm ci && npm run dev` works on a clean machine; `npm run lint test build` all pass in CI |
| 04 | Backend core & auth | All Mongoose models; shared schemas; auth (argon2id, sessions, lockout); roles/capabilities; rate limits; origin check; audit log; `create-admin` CLI | Models, auth routes, middleware, `DATABASE_SCHEMA.md`, `API_REFERENCE.md` (auth) | 03 | Integration tests: login, lockout, session expiry, 401/403 matrix, validation errors; unit tests for services | All auth/security tests pass; no admin route reachable without the correct capability |
| 05 | CMS APIs & media | CRUD for settings, pages/sections, services, projects, taxonomies, testimonials, pricing, careers, training, redirects; draft/publish/preview/revisions/conflicts; media pipeline + storage adapter; leads API + email notification; seed and migration scripts | Complete REST API, seed from the verified inventory, updated `API_REFERENCE.md` | 04; Q9, Q12 | Integration tests per resource incl. publish isolation (public never sees drafts), 409 conflicts, upload rejection cases, lead spam limits | Coverage ≥ 80% on services/controllers; API docs match routes (contract test) |
| 06 | Design system implementation & public shell | Tokens, primitives, typography, ResponsiveImage, Reveal/motion utilities, header/mega-menu/mobile menu, footer, section renderers, dev-only design catalogue route | Component library + section registry | 02, 05 (public API) | Component tests, axe on the catalogue, keyboard tests for nav | Every approved section renders from API data; AA contrast; reduced-motion respected |
| 07 | Public website | Home, About, Services index + detail, Portfolio index (filters) + case study, Testimonials, Pricing (if approved), Careers, Training (if approved), Contact + lead form, legal pages, 404; meta injection, JSON-LD, sitemap, robots, legacy redirects | Complete public site wired to the CMS | 06 | Playwright journeys (navigate, filter, submit lead), axe on every template, Lighthouse CI | Lighthouse ≥ 90 ×4 on mobile for key templates; zero hardcoded business content in components |
| 08 | Admin dashboard | Login, dashboard, settings editors, page builder (sections add/reorder/hide/edit), entity managers, media library, leads inbox, users, audit log, redirects, preview | Complete admin + `ADMIN_GUIDE.md` | 05, 06 | Playwright admin flows per role; tests for the publish/preview workflow; role-denial tests in the UI and API | A non-developer completes the scripted tasks in `ADMIN_GUIDE.md` without help |
| 09 | Content entry, QA & hardening | Load verified content and optimised images; full accessibility, performance, SEO and security review; cross-device testing; backup/restore rehearsal | QA report, fixes, filled `CONTENT_INVENTORY.md` status | 07, 08 | Manual screen-reader pass, ASVS L1 checklist, `npm audit`, broken-link check, redirect test against the legacy URL list | No open high or critical issues; owner signs off on content |
| 10 | Deployment & launch | Hosting, Atlas, domain/DNS/SSL, secrets, CI deploy, monitoring, backups, Search Console, analytics (with consent if required), go-live checklist, rollback plan, admin handover | Live site, `DEPLOYMENT.md`, final `PROGRESS.md` | 09, Q10 | Smoke tests on production, redirect verification, uptime check | Site live on the domain; backups verified by a test restore; owner trained |

---

## 11. Risks, unresolved questions and decisions requiring approval

### 11.1 Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Legacy project/data exists only locally and could be lost | High | §1.3 snapshot branch and §5.4 `mongodump` **before** Stage 03 |
| Site content unverifiable from this environment | High | §2.4 options; nothing unverified gets published |
| Conflicting company facts / legal status | High (legal, trust) | Owner confirms Q1; legal name shown only as confirmed |
| No portfolio or testimonial material, or no client permission | Medium | Launch with fewer, verified case studies; testimonial consent field enforced |
| SEO ranking loss on migration | Medium | Legacy URL map, 301s, Search Console, unchanged NAP data |
| SPA SEO and social-preview limits | Medium | Meta injection (option B), SSR-safe components |
| Page builder drifting into arbitrary layout editing | Medium (design quality, scope) | Approved section registry with fixed variants (§6.2) |
| Lead email deliverability | Medium | Domain SMTP with SPF/DKIM/DMARC; leads are stored in the DB regardless |
| Single admin is a key-person risk (no password reset) | Medium | At least 2 super_admins; CLI reset; email reset once SMTP exists |
| Native modules (`argon2`, `sharp`) failing on the host | Low–Medium | Prebuilt binaries; `bcrypt` fallback; host chosen with Node 22 support |
| `mongodb-memory-server` binary download blocked in CI | Low | Cache the binary, or use a CI service container |
| `react-router@8` needs Node ≥ 22.22.0 | Low | `.nvmrc` + `engines`; fall back to v7 if needed |
| DPDP Act obligations for lead data | Medium | Consent notice, privacy policy, retention, erasure |

### 11.2 Questions and decisions requiring approval
**Blocking for Stage 01:**
1. **Q1 Company identity:** the exact public name ("Technology" or "Technologies"), legal entity name and current registration status, founding year, current phone numbers and emails to publish, office hours, and social accounts.
2. **Q2 Legacy code and data:** does the earlier Vite/React/Express project exist locally? Should it be pushed to `legacy/local-snapshot`? Does the local MongoDB contain data worth keeping?
3. **Q3 Training business:** merge `training.bitbyteindia.com` into the new site (adds `trainingPrograms` and training enquiries), keep it separate and unchanged, or leave it out?
4. **Q4 Content access:** which of §2.4 (a)/(b)/(c)? Will the owner supply the vector logo and brand assets?

**Needed before Stage 02–05:**
5. **Q5 Pricing:** publish pricing (fixed / starting-at / quote-based), or ship the module hidden?
6. **Q6 Portfolio and testimonials:** which projects and clients can be shown, and is written consent available for testimonials?
7. **Q7 Careers:** list openings and apply by email, or an application form with CV upload (more PII and file handling)?
8. **Q8 Rendering:** approve option B (SPA + server meta injection), or require full SSR now?
9. **Q9 Media storage:** Cloudinary, S3/R2, or a self-hosted disk?
10. **Q10 Hosting:** budget, VPS or managed platform, MongoDB Atlas (Mumbai), the domain/DNS owner, and the Node version available on the user's machine.
11. **Q11 Lead data retention** period (e.g. 24 months), and who receives lead notifications.
12. **Q12 Email:** SMTP provider/mailbox for notifications and password resets.
13. **Q13 Roles:** confirm the three-role model (§6.1), and whether editors need a review/approval step.
14. **Q14 Analytics:** GA4, a privacy-friendly alternative, or none; plus any cookie-consent requirement.
15. **Q15 Blog:** confirm it is out of scope for launch.

### 11.3 Decisions proposed for approval (to be recorded as ADRs in `DECISIONS.md`)
ADR-001 npm-workspaces monorepo (`client`, `server`, `shared`) · ADR-002 single-origin deployment · ADR-003 dual-state draft/publish documents with revisions · ADR-004 approved section registry (no arbitrary layout) · ADR-005 opaque server-side sessions + argon2id · ADR-006 rendering option B · ADR-007 media adapter, binaries outside MongoDB · ADR-008 zod schemas shared between client and server · ADR-009 CSS-first motion, `motion` lib only where justified · ADR-010 self-hosted fonts · ADR-011 Node ≥ 22.22 LTS.

---

## 12. First actions for Stage 01 (after approval)

1. **Preserve legacy work:** the user pushes any local project to `legacy/local-snapshot` (§1.3) and runs the read-only DB inventory plus `mongodump` (§5.4); I review both.
2. **Unblock site capture:** the user allow-lists the three BitByte hosts in the environment's network settings, or provides an export (§2.4). I then crawl every page into `legacy/site/`, record each URL's HTTP status, and download all assets into `legacy/assets/`.
3. **Collect brand assets:** vector logo, favicon and any brand guidelines.
4. **Owner answers Q1–Q4** (identity, legacy, training scope, content access).
5. **Write the documentation baseline** (§13) with the approved decisions, and replace the placeholder `README.md`.
6. **Complete `CONTENT_INVENTORY.md`:** every page, section, fact and asset, with its source URL, verification status, owner decision (keep / rewrite / drop) and target location in the new CMS.
7. **Produce the legacy URL list → new URL map** for redirects.
8. **Add `.gitignore`, `.editorconfig` and `.nvmrc`** (no packages installed yet; those start in Stage 03).
9. **Stage 01 report:** what was verified, what changed in the plan, and the Stage 02 readiness check.

---

## 13. Documentation set: purpose and update rules

All documents live in the repository and are updated **in the same commit or PR** as the change they describe. A stage is not complete until its docs match the code.

| File | Must contain | Update when |
|---|---|---|
| `README.md` | Project summary, tech stack, prerequisites (Node version, MongoDB), setup (`npm ci`, `.env` from the examples), scripts, repo layout, links to docs | Any change to setup, scripts, structure or prerequisites |
| `docs/PROJECT_PLAN.md` | Goals, scope/non-scope, the stage table (§10) with acceptance criteria, owners, open questions | Scope or stage changes; decisions answering open questions |
| `docs/PROGRESS.md` | Per-stage log: date, what was done, packages added/removed/upgraded with reasons, test/build results, known issues, next steps | End of every working session and every stage |
| `docs/ARCHITECTURE.md` | System diagram, repo layout, layering rules, request lifecycle, auth/session flow, publish/preview flow, rendering/SEO approach, media pipeline, error contract, config/env vars | Any structural change, new layer, new integration |
| `docs/DESIGN_SYSTEM.md` | Brand palette (with contrast results), typography scale, spacing, radii, shadows, breakpoints, motion tokens and rules, component and section catalogue (variants, usage), accessibility rules | Any token, component or section-type change |
| `docs/DATABASE_SCHEMA.md` | Every collection: fields, types, validation, indexes, relationships, draft/publish structure, retention/TTL, migration notes | Any model, index or migration change |
| `docs/API_REFERENCE.md` | Conventions (base path `/api/v1`, envelope `{ data, meta }` / `{ error: { code, message, details } }`, pagination, auth, status codes), then every endpoint: method, path, capability, request schema, response example, errors | Any route added, changed or removed (checked by a contract test) |
| `docs/CONTENT_INVENTORY.md` | Every page, section, fact and asset from the old site: source URL, verification status ([W]/[S]/[T]/owner), decision, CMS location, owner sign-off | When content is verified, migrated, changed or approved |
| `docs/ADMIN_GUIDE.md` | Non-technical guide: sign-in, roles, editing and previewing, publishing, sections, media and alt text, SEO fields, leads, users, troubleshooting, with screenshots | Any admin UI or workflow change |
| `docs/DEPLOYMENT.md` | Environments, hosting, env vars (names only), build and release steps, DB/media backups and restore, domain/DNS/SSL, monitoring, rollback, launch checklist | Any infrastructure or release process change |
| `docs/DECISIONS.md` | ADR log: context, decision, alternatives, consequences, date, status (proposed / accepted / superseded) | Every significant technical, dependency or business decision |

---

## Sources consulted (all unverified; see evidence labels)

- Search-index entries for the official site: [bitbyteindia.com](https://bitbyteindia.com/), [/careers/](https://www.bitbyteindia.com/careers/), [/cms-development](https://bitbyteindia.com/cms-development), [training.bitbyteindia.com](https://training.bitbyteindia.com/), [training /about/](https://training.bitbyteindia.com/about/), [training /industrial-training/](https://training.bitbyteindia.com/industrial-training/)
- Third-party: [Clutch](https://clutch.co/profile/bitbyte-software-technology), [The Manifest](https://themanifest.com/company/bitbyte-software-technology), [LinkedIn](https://in.linkedin.com/company/bitbyte-software-technology), [Crunchbase](https://www.crunchbase.com/organization/bitbyte-software-technology), [Zauba Corp](https://www.zaubacorp.com/BITBYTE-SOFTWARE-TECHNOLOGY-PRIVATE-LIMITED-U74999MP2017PTC042630), [Instagram @bitbyteindia](https://www.instagram.com/bitbyteindia/), [Tracxn](https://tracxn.com/d/companies/bitbyte/__AJZ41oX6M_ka7lhZc2hNd_ixcxNJa7WGvJvF5cg0YeU), [ZoomInfo](https://www.zoominfo.com/c/bitbyte/467061649), [Yappe](https://yappe.in/madhya-pradesh/indore/bitbyte-software-technology/336016)
- Several similarly named but unrelated companies (BitByte Innovations, Bit Byte Technology Ltd, BitBytes, BitByteInfo, Bitbyte Creations) were found and excluded.
