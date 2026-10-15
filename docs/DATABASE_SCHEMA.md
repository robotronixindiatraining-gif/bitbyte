# Database Schema (MongoDB + Mongoose)

| | |
|---|---|
| **Status** | Stage 02 specification. Proposed, awaiting approval. |
| **Database** | One MongoDB database (`bitbyte`). Dev: `mongodb://127.0.0.1:27017/bitbyte`. Prod: MongoDB Atlas (D-021). |
| **Principles** | Hybrid CMS (D-008) · draft/published dual state (D-009) · optimistic concurrency (D-010) · media by reference, binaries in object storage (D-013) · placeholders block publishing (D-015) |

---

## 1. Collection overview

| Collection | Purpose | Draft/publish | Justification (from the content inventory) |
|---|---|:-:|---|
| `admins` | Administrator accounts; role is always `super_admin` | — | Required: secure admin access |
| `sessions` | Server-side login sessions | — | Revocable sessions (D-011) |
| `settings` | Global site settings, one document per key | ✓ | Company info, contact block, navigation and footer appear on every page (inventory §G) |
| `pages` | Fixed-template and custom pages built from ordered sections | ✓ | Home, About, Services index, Portfolio, Careers, Contact, legal pages |
| `services` | Service detail pages | ✓ | 5 services in the indexed menu, with structured lists (inventory P4–P8) |
| `projects` | Portfolio case studies | ✓ | 8 named projects (inventory P9) |
| `taxonomies` | Project categories and technology tags | — | Portfolio filter labels (Web Development, E-Commerce, Internet of Things) |
| `testimonials` | Client testimonials, published only with recorded consent | ✓ | Required by the brief; **none exist yet** (CG-17), so sections stay hidden while empty |
| `jobOpenings` | Career opportunities | ✓ | The careers page has a "Current Opportunities" section (inventory P12) |
| `media` | Metadata for uploaded images (no binaries) | — | Alt text, variants, safe deletion and reuse across content |
| `leads` | Contact / project-enquiry submissions | — | The contact form exists, with 7 fields + captcha (inventory P13a) |
| `redirects` | Slug-change and unpreservable legacy redirects | — | Indexed service URLs are preserved (D-038), so it starts empty; slug changes create entries automatically |
| `orderings` | Draft/published order of listings | ✓ | Ordering changes must not go live until published (D-037) |
| `revisions` | Snapshots of each published version | — | Rollback; justified because one admin publishes directly, with no reviewer |
| `auditLogs` | Record of privileged actions | — | Accountability for an all-powerful single role |

### Evaluated and not created (D-016)
| Candidate | Decision | Reason |
|---|---|---|
| `pricingPlans` | **No collection.** Pricing becomes an `engagementModels` **section type** stored on a page. | No pricing was found on the site (CG-18), and plans aren't reused across pages. The section stays unused until the owner supplies verified models. |
| `blogPosts` | **No collection** | No blog was found in any index; nobody owns blog content. Can be added later without schema changes elsewhere. |
| `trainingPrograms` | **Excluded** | The training site is a separate property (D-003). |
| `teamMembers`, `clients` | **No collection** | No verified team or client data. Client logos, if approved, use the `clientLogos` section with media references. |
| Public `users` | **Never** | No public accounts (D-004). |

---

## 2. Shared conventions

### 2.1 Publishable document shape
Used by `settings`, `pages`, `services`, `projects`, `testimonials`, `jobOpenings` and `orderings`.

```js
{
  _id: ObjectId,
  slug: String,                 // live (published) slug; absent on settings/testimonials
  status: 'draft' | 'published' | 'archived',
  //   draft     = never published (published === null)
  //   published = live on the public site
  //   archived  = removed from the public site; content and history kept
  draft:     { /* full editable content, per collection (below) */ },
  published: { /* snapshot of draft at last publish */ } | null,
  hasUnpublishedChanges: Boolean, // draft differs from published
  revision: Number,               // +1 on every draft save; optimistic concurrency token (D-010)
  publishedRevision: Number|null, // revision number that is live
  firstPublishedAt: Date|null,
  publishedAt: Date|null,
  publishedBy: ObjectId|null,     // → admins
  // derived on every save, never sent by clients:
  mediaRefs: [ObjectId],          // → media, union of draft + published references
  entityRefs: [{ kind: String, id: ObjectId }], // services/projects/testimonials/pages/jobs referenced
  placeholders: [String],         // "[CONFIRM …]" tokens found in draft (D-015)
  createdBy: ObjectId, updatedBy: ObjectId,
  createdAt: Date, updatedAt: Date // Mongoose timestamps
}
```

**Rules**
- **Public reads** filter on `status: 'published'` and project **only** `slug` + `published`. Listing order comes from the published `orderings` document (D-037). Draft fields never leave the server on public routes.
- **Draft save:** `updateOne({ _id, revision: clientRevision }, { $set: { draft, … }, $inc: { revision: 1 } })`. If no document matched → 409 `EDIT_CONFLICT`. The save is atomic in one document.
- **Publish:**
  1. Validate `draft` with the strict *publishable* schema.
  2. Require `placeholders.length === 0`.
  3. Require all `entityRefs` published and all `mediaRefs` present.
  4. Set `published = draft`, `status = 'published'`, `publishedRevision = revision`, `hasUnpublishedChanges = false`.
  5. Then insert a `revisions` snapshot and an `auditLogs` entry. The live change is one atomic single-document update, so **no multi-document transaction is needed**. Local standalone MongoDB works as-is.
- **Slug change:** an edited slug lives in `draft.slug` until publish. On publish the old slug gets an automatic 301 in `redirects` (`source: 'slug-change'`). Slug uniqueness is checked across `slug` and `draft.slug` of other documents. **Services and custom pages share one top-level namespace** (D-038), so uniqueness is checked across both collections plus the reserved list (§5).
- **Unpublish:** `status → 'archived'`. `published` is kept so it can be republished or restored.
- **Restore revision:** copies a snapshot into `draft` (not live until published again).

### 2.2 Reusable sub-schemas (defined once in `shared/`)

```js
Seo = {
  title: String (≤ 70),            // falls back to entity title + settings.seo.titleTemplate
  description: String (≤ 170),
  canonicalPath: String|null,      // only for exceptional cases; default is the route itself
  ogImage: ObjectId|null,          // → media
  noindex: Boolean (default false)
}

Link = {
  label: String (1–60),
  kind: 'internal' | 'external' | 'entity',
  href: String,                    // internal: must start with "/"; external: https?:// only
  entity: { kind: 'page'|'service'|'project'|'job', id: ObjectId } | null,
                                   // entity links resolve to the CURRENT slug at render time,
                                   // so slug changes never break navigation or CTAs
  openInNewTab: Boolean
}

ImageRef = { media: ObjectId, altOverride: String|null }  // alt defaults to media.alt
RichText = String                  // HTML sanitised server-side (allowlist, D-014), ≤ 20 000 chars
```

Forbidden everywhere: `javascript:`/`data:` URLs, inline styles, scripts, iframes (except the map embed URL allowlisted in settings), and arbitrary class names.

### 2.3 Placeholder convention (D-015)
Seed content uses the `[CONFIRM …]` placeholders from `CONTENT_GAPS.md`. Every save scans text fields for `/\[CONFIRM[^\]]*\]/` and stores matches in `placeholders`. **A document with placeholders cannot be published**, and the dashboard lists them all, so unverified facts can never reach the live site by accident.

---

## 3. Collections

### 3.1 `admins`
| Field | Type | Rules |
|---|---|---|
| `name` | String | 1–80 |
| `email` | String | lower-cased, trimmed, valid e-mail, **unique** |
| `passwordHash` | String | argon2id encoded hash; never returned by any API (`select: false`) |
| `role` | String | **enum `['super_admin']`**, default `'super_admin'`. The only role that exists (D-004) |
| `status` | String | `active` \| `disabled` |
| `failedLoginCount` | Number | reset on success |
| `lockUntil` | Date\|null | set after repeated failures |
| `lastLoginAt` | Date\|null | |
| `passwordChangedAt` | Date | invalidates older sessions |
| `mustChangePassword` | Boolean | true for CLI-created or reset accounts |
| `twoFactor` | `{ enabled: Boolean, secretEncrypted: String (AES-256-GCM, key from env), lastUsedStep: Number, enrolledAt: Date, recoveryCodeHashes: [String] (HMAC-SHA-256), recoveryCodesGeneratedAt: Date }` | **Mandatory** (D-026). `select: false`; secret never returned after enrolment; rules in D-039 |
| `securityAlertUntil` | Date\|null | set for 7 days after any password/2FA reset (dashboard alert) |
| `createdBy` | ObjectId\|null | null when created by the CLI |
| timestamps | | |

Indexes: `{ email: 1 }` unique.
Invariants (service layer): at least one `active` admin must always exist; an admin cannot disable or delete their own account.

### 3.2 `sessions`
| Field | Type | Rules |
|---|---|---|
| `tokenHash` | String | SHA-256 of the 256-bit random cookie value, **unique**. The raw token is never stored. |
| `admin` | ObjectId → admins | |
| `createdAt` | Date | |
| `lastSeenAt` | Date | updated at most once per minute |
| `expiresAt` | Date | `min(lastSeenAt + idle, createdAt + absolute)` |
| `stage` | enum | `mfa_pending` (after a correct password; ≤ 5 min, single use) · `enrollment` (restricted: enrol / change password / logout only) · `active` (full access) (D-039) |
| `mfaAttempts` | Number | max 5 per `mfa_pending` session |
| `stepUpAt` | Date\|null | last password + TOTP re-authentication; sensitive actions need ≤ 5 min |
| `ipHash`, `userAgent` | String | for the "active sessions" view |

Indexes: `{ tokenHash: 1 }` unique · `{ admin: 1 }` · `{ expiresAt: 1 }` **TTL** (`expireAfterSeconds: 0`).

### 3.3 `settings`
One publishable document per `key` (unique). Draft/publish applies so header/footer changes can be previewed. Keys and draft shapes:

| Key | Content |
|---|---|
| `general` | `companyName` (`[CONFIRM COMPANY NAME]`), `legalName` (`[CONFIRM LEGAL ENTITY NAME]`, optional), `tagline`, `logo: ImageRef`, `logoInverse: ImageRef`, `favicon: ImageRef` |
| `contact` | `addressLines[]`, `city`, `region`, `postalCode`, `country`, `phones[{ label, number, whatsapp: Boolean }]`, `emails[{ label, address }]`, `hours` (`[CONFIRM OFFICE HOURS]`), `mapEmbedUrl` (allowlisted host), `mapLinkUrl`, `geo{ lat, lng }` |
| `navigation` | `header: [{ link: Link, children: [Link] }]` (max 8 top-level, 10 children), `cta: Link` |
| `footer` | `columns: [{ heading, links: [Link] }]` (max 4), `showContact: Boolean`, `copyrightHolder` (`[CONFIRM LEGAL ENTITY NAME]`), `bottomLinks: [Link]` |
| `social` | `profiles: [{ platform: enum(linkedin, instagram, facebook, x, youtube, github, whatsapp), url }]` |
| `seo` | `titleTemplate` (e.g. `%s · BitByte`), `defaultDescription`, `defaultOgImage: ImageRef`, `organization{ name, logo, sameAs[] }` for JSON-LD, `searchConsoleToken` |
| `leadForm` | `budgetOptions: [String]` (`[CONFIRM BUDGET OPTIONS]`), `consentText` (`[CONFIRM CONSENT TEXT]`), `successMessage`, `notificationEmails: [String]` (max 5, **not public**, D-019) |
| `careers` | `applicationMethod: 'instructions'|'email'|'external'|'form'` (default `instructions`; `form` rejected until enabled, D-031), `careersEmail` (`[CONFIRM CAREERS EMAIL]`), `externalUrl` |
| `privacy` | `leadRetentionDays` (default **365**, 30–1095, never empty, D-032), `spamRetentionDays` (30) |
| `integrations` | `turnstileSiteKey` (public key only, D-020). Analytics is deferred (D-033), so there are no analytics fields yet. **Secrets never live in the DB.** |

Public projection strips `leadForm.notificationEmails` and anything else marked `private` in the schema.

### 3.4 `pages`
| Field | Type | Rules |
|---|---|---|
| `slug` | String | unique; `''` for home; kebab-case; **not** in the reserved list (§5) |
| `template` | enum | `home`, `about`, `services-index`, `portfolio-index`, `careers`, `contact`, `legal`, `custom` |
| `system` | Boolean | true for template pages: cannot be deleted, slug locked |
| `draft` / `published` | `{ title, sections: [Section], seo: Seo }` | `title` 1–120; max 20 sections |

**Section** (embedded, order = array order):
```js
{ key: String /* stable id */, type: SectionType, visible: Boolean,
  anchorId: String|null /* kebab-case, unique within page */,
  variant: { background: 'light'|'muted'|'dark', spacing: 'default'|'compact' },
  data: { /* validated by the section type's schema, §4 */ } }
```
Template rules (enforced by service + admin UI):

| Template | Required section (exactly one, cannot be removed) | Allowed sections |
|---|---|---|
| `home` | `hero` | all except `contactForm`, `jobList` |
| `about` | `hero` | `richText`, `splitContent`, `featureList`, `stats`, `processSteps`, `testimonials`, `clientLogos`, `ctaBanner`, `faq` |
| `services-index` | `serviceGrid` | `hero`, `richText`, `featureList`, `processSteps`, `engagementModels`, `testimonials`, `ctaBanner`, `faq` |
| `portfolio-index` | `projectShowcase` (with filters) | `hero`, `richText`, `testimonials`, `clientLogos`, `ctaBanner` |
| `careers` | `jobList` | `hero`, `richText`, `featureList`, `splitContent`, `ctaBanner`, `faq` |
| `contact` | `contactForm` | `hero`, `richText`, `faq` |
| `legal` | `richText` | — |
| `custom` | — | all except `contactForm` duplicates (max one per page) |

Indexes: `{ slug: 1 }` unique · `{ status: 1 }` · `{ 'draft.slug': 1 }` sparse · `{ mediaRefs: 1 }` · `{ 'entityRefs.id': 1 }`.

### 3.5 `services`
`draft` / `published` content, shaped by the structure found on the indexed service pages:

| Field | Type | Rules / source example |
|---|---|---|
| `title` | String 1–80 | "Internet of Things" |
| `navLabel` | String ≤ 40 | "CMS Solutions" (menu label differs from the page slug `cms-development`) |
| `slug` | String | kebab-case (draft slug, §2.1) |
| `summary` | String ≤ 240 | Card text on grids |
| `icon` | enum (curated icon names) \| null | from the design-system icon set |
| `heroImage` | ImageRef \| null | |
| `intro` | RichText | e.g. the IoT definition paragraph |
| `offerings` | `[{ title ≤ 80, description: RichText?, items: [String ≤ 120] (max 20) }]` (max 12) | e.g. "IoT Consulting" → list; "SEO" → audit/on-page/off-page… |
| `industries` | `[String ≤ 60]` (max 20) | IoT industries list |
| `process` | `[{ title, description ≤ 300 }]` (max 8) | |
| `technologies` | `[ObjectId → taxonomies(type=technology)]` | |
| `faqs` | `[{ question ≤ 200, answer: RichText }]` (max 15) | |
| `relatedProjects` | `[ObjectId → projects]` (max 6) | only published projects render |
| `cta` | `{ heading, text, link: Link }` \| null | falls back to the global CTA |
| `featured` | Boolean | eligible for "featured" grids |
| `seo` | Seo | |

Indexes: `{ slug: 1 }` unique · `{ status: 1 }` · `{ 'draft.slug': 1 }` sparse · `{ mediaRefs: 1 }` · `{ 'entityRefs.id': 1 }`. Service URLs are top-level `/<slug>` (D-038).

### 3.6 `projects`
| Field | Type | Rules |
|---|---|---|
| `title` | String 1–100 | e.g. "Apna Gaadi" |
| `summary` | String ≤ 240 | `[CONFIRM PORTFOLIO PROJECT DETAILS]` until verified |
| `category` | ObjectId → taxonomies(projectCategory) | required to publish |
| `technologies` | `[ObjectId → taxonomies(technology)]` | |
| `services` | `[ObjectId → services]` | |
| `client` | `{ name ≤ 100, showName: Boolean }` | name shown only when `showName` |
| `overview`, `challenge`, `solution`, `outcome` | RichText (all optional) | **`outcome` must contain only verified results** (CG-25) |
| `cover` | ImageRef | required to publish |
| `gallery` | `[{ image: ImageRef, caption ≤ 160 }]` (max 20) | |
| `liveUrl` | https URL \| null | |
| `year` | Number (2000–current) \| null | |
| `featured` | Boolean | |
| `seo` | Seo | |

Top level, outside draft/published: `permission: { confirmed: Boolean, confirmedAt: Date, note: String }`. **Publishing requires `permission.confirmed`** (client consent to show the work, CG-07b), recorded with date and note.
Indexes: `{ slug: 1 }` unique · `{ status: 1 }` · `{ 'published.category': 1, status: 1 }` · `{ 'published.featured': 1 }` · `{ mediaRefs: 1 }`.

### 3.7 `taxonomies`
| Field | Type | Rules |
|---|---|---|
| `type` | enum | `projectCategory` \| `technology` |
| `name` | String 1–60 | |
| `slug` | String | unique per type |

Names are not draft-managed (labels only). The **order of project categories** is drafted and published through `orderings.projectCategories` (D-037). Deletion is blocked while any service or project references it.
Indexes: `{ type: 1, slug: 1 }` unique.

### 3.8 `testimonials`
| Field | Type | Rules |
|---|---|---|
| `quote` | String 10–800 | stored exactly as approved by the client |
| `authorName` | String 1–80 | |
| `authorRole` | String ≤ 80 | |
| `company` | String ≤ 100 | |
| `photo` | ImageRef \| null | requires consent covering the photo |
| `project` | ObjectId → projects \| null | |
| `featured` | Boolean | |

Top level: `consent: { confirmed: Boolean, confirmedAt: Date, method: 'email'|'document'|'other', note }`. **Publishing requires `consent.confirmed`.** Third-party directory reviews must not be entered as testimonials (see `ADMIN_GUIDE.md`).
Indexes: `{ status: 1 }` · `{ 'published.featured': 1 }`.

### 3.9 `jobOpenings`
| Field | Type | Rules |
|---|---|---|
| `title` | String 1–100 | |
| `department` | String ≤ 60 | |
| `location` | String ≤ 100 | |
| `employmentType` | enum | `full_time`, `part_time`, `internship`, `contract` (maps to schema.org JobPosting) |
| `experience` | String ≤ 60 | |
| `summary` | String ≤ 240 | |
| `description` | RichText | |
| `responsibilities`, `requirements` | `[String ≤ 200]` (max 20 each) | |
| `applyInstructions` | RichText | e.g. "e-mail your CV to …" (CG-19; no CV upload, D-031) |
| `closesAt` | Date \| null | after this date the job is hidden publicly and dropped from the sitemap |
| `seo` | Seo | |

Indexes: `{ slug: 1 }` unique · `{ status: 1, 'published.closesAt': 1 }`.

### 3.10 `media`
| Field | Type | Rules |
|---|---|---|
| `driver` | String | `cloudinary` (production, D-018) or `local` (development) |
| `storageKey` | String | Cloudinary `public_id` (`bitbyte/<env>/<uuid>`) or local key; never the user's filename; **unique** |
| `version` | Number | Cloudinary asset version (cache-busting in delivery URLs) |
| `format` | String | stored format after normalisation |
| `url` | String | canonical delivery URL of the normalised original (secure HTTPS) |

Responsive variants are **not stored**: delivery URLs are generated from `storageKey` + `version` with fixed transformations (`f_auto,q_auto,c_limit,w_{480|768|1024|1440|1920}`), capped at the original width. The `local` driver writes the same fixed widths to disk in development.
| `originalFilename` | String | sanitised, display only |
| `mimeType` | enum | `image/jpeg`, `image/png`, `image/webp`, `image/avif` (verified by magic bytes) |
| `bytes`, `width`, `height` | Number | |
| `dominantColor` | String `#RRGGBB` | placeholder background while loading |
| `alt` | String ≤ 250 | **required unless `decorative`** |
| `decorative` | Boolean | renders `alt=""` |
| `caption`, `credit`, `licence` | String | licence/credit required for stock imagery |
| `folder` | String | e.g. `brand`, `services`, `portfolio` |
| `tags` | `[String]` | |
| `checksum` | String | SHA-256 of the original; duplicate uploads are detected and offered for reuse |
| `uploadedBy` | ObjectId → admins | |
| timestamps | | |

**No binary data in MongoDB.** Content stores `media` ObjectIds, never URLs. URLs, alt text and variants are resolved at read time, so replacing an image or fixing alt text updates every usage.
**Deletion** removes the Cloudinary asset (signed server-side API call) and then the document. It is allowed only when `count(collection.find({ mediaRefs: id }))` is 0 across `pages`, `services`, `projects`, `testimonials`, `jobOpenings` and `settings`. `mediaRefs` covers drafts **and** published snapshots, plus `revisions` from the last 90 days, so a restore can't point to a deleted file.
Indexes: `{ storageKey: 1 }` unique · `{ checksum: 1 }` · `{ folder: 1, createdAt: -1 }` · text index on `alt`, `originalFilename`, `tags`.

### 3.11 `leads`
Fields mirror the indexed contact form (inventory P13a), so no business field is invented.

| Field | Type | Rules |
|---|---|---|
| `type` | enum | `project_enquiry` (contact form) \| `career` (D-031) |
| `fullName` | String 1–100 | required ("Full Name*") |
| `companyName` | String ≤ 120 | required for `project_enquiry` ("Company Name*") |
| `companyLocation` | String ≤ 120 | required for `project_enquiry` ("Company Location*") |
| `email` | String | valid e-mail, required ("Work Email Address*") |
| `phone` | String | E.164-ish pattern, 7–20 chars, required ("Phone Number*") |
| `budget` | String | must be one of `settings.leadForm.budgetOptions` ("Approx Budget*") |
| `message` | String 10–5000 | required ("Tell us about your project*"); stored as plain text |
| `service` | ObjectId → services \| null | when submitted from a service page |
| `sourcePath` | String | page the form was submitted from |
| `utm` | `{ source, medium, campaign, term, content }` | |
| `consent` | `{ given: true, text: String, at: Date }` | the exact consent text shown is copied in (DPDP evidence) |
| `status` | enum | `new` → `contacted` → `in_discussion` → `won` \| `lost`; also `spam` |
| `notes` | `[{ admin: ObjectId, text ≤ 2000, at }]` | |
| `notification` | `{ sentAt: Date\|null, attempts: Number, lastError: String\|null }` | |
| `ipHash` | String | salted SHA-256; raw IPs are not stored |
| `userAgent` | String ≤ 300 | |
| `spamSignals` | `{ honeypot: Boolean, fillTimeMs: Number, turnstile: 'pass'|'unverified' }` | `unverified` = Cloudflare unreachable (D-020); invalid tokens are rejected with 422 and never stored |
| `expiresAt` | Date | `createdAt + settings.privacy.leadRetentionDays` (spam: 30 days); recomputed when the setting changes |
| timestamps | | |

Leads are **never** exposed on public routes. **Retention (D-032):** configurable, **default 365 days**, never indefinite. A daily purge job hard-deletes leads whose `expiresAt` has passed and records one audit entry with counts only. Erasure on request = hard delete + audit entry without PII. Deleted data persists only in database backups until they expire (≤ 35 days, `DEPLOYMENT.md`). Index `{ expiresAt: 1 }` (used by the purge job; not a TTL index, so every deletion is audited).
Indexes: `{ status: 1, createdAt: -1 }` · `{ email: 1 }` · `{ createdAt: -1 }`.

### 3.12 `redirects`
| Field | Type | Rules |
|---|---|---|
| `fromPath` | String | normalised (lower-case, no trailing slash, no query), **unique** |
| `toPath` | String | internal path or absolute https URL; must not create a loop or chain longer than 1 |
| `statusCode` | 301 \| 302 | |
| `enabled` | Boolean | |
| `source` | enum | `legacy`, `slug-change`, `manual` |
| `hits`, `lastHitAt` | Number, Date | incremented asynchronously |

Starts **empty**: the indexed legacy URLs are preserved (D-038). Trailing-slash, case and host normalisation are handled in code, not stored here. The fromPath can't be a reserved prefix (`/api`, `/admin`).
Indexes: `{ fromPath: 1 }` unique.

### 3.13 `revisions`
| Field | Type |
|---|---|
| `entityType` | enum `settings`, `page`, `service`, `project`, `testimonial`, `job`, `ordering` |
| `entityId` | ObjectId |
| `revision` | Number (the `publishedRevision`) |
| `snapshot` | Object (the published content + slug) |
| `publishedBy`, `publishedAt` | ObjectId, Date |
| `note` | String ≤ 200 (optional publish note) |

Retention: the latest **25 per entity** (pruned on publish). Indexes: `{ entityType: 1, entityId: 1, publishedAt: -1 }`.

### 3.14 `auditLogs`
| Field | Type |
|---|---|
| `at` | Date |
| `actor` | ObjectId → admins \| null (null = system/CLI) |
| `actorEmail` | String (denormalised so the log survives admin deletion) |
| `action` | e.g. `auth.login`, `auth.login_failed`, `auth.logout`, `auth.locked`, `content.save_draft`, `content.publish`, `content.unpublish`, `content.restore`, `content.delete`, `media.upload`, `media.delete`, `lead.status_change`, `lead.export`, `lead.erase`, `settings.publish`, `admin.create`, `admin.disable`, `admin.password_reset`, `redirect.change` |
| `entityType`, `entityId` | String, ObjectId |
| `summary` | String ≤ 300 (no secrets, no lead PII) |
| `ipHash`, `requestId` | String |

Append-only (no update/delete API). Retention 24 months (TTL index on `at`, adjustable).
Indexes: `{ at: -1 }` · `{ entityType: 1, entityId: 1, at: -1 }` · `{ actor: 1, at: -1 }` · TTL on `at`.

---

### 3.15 `orderings` (D-037)
One publishable document per list, so **ordering changes are drafted, previewed and published** like content.

| Field | Type | Rules |
|---|---|---|
| `key` | enum | `services`, `projects`, `testimonials`, `jobOpenings`, `projectCategories`; **unique** |
| `draft` / `published` | `{ ids: [ObjectId] }` | ids of documents in that collection; duplicates rejected; max 500 |
| status fields | as §2.1 | `revision` for concurrency; publishing writes a revision snapshot |

- **Rendering:** public listings sort by `published.ids`. Published items missing from the list come after it, newest `firstPublishedAt` first. Previews use `draft.ids`.
- **Creating** an entity appends its id to the draft order. **Deleting** one removes it from both lists.
- **Section order** within a page lives in the page draft; **menu order** lives in the `navigation` settings draft. All three go live only on publish.

Indexes: `{ key: 1 }` unique.

---

## 4. Section types (registry in `shared/src/sections/`)

Each type has a zod schema (draft-lenient and publish-strict variants), an admin form and a renderer. **Only developers add types** (D-008). The visual design of each is in `DESIGN_SYSTEM.md` §9.

| Type | `data` fields | References |
|---|---|---|
| `hero` | `eyebrow ≤ 40`, `heading 1–120`, `highlight ≤ 40` (a phrase within the heading to accent), `subheading ≤ 300`, `primaryCta: Link`, `secondaryCta: Link?`, `visual: 'bitgrid'|'image'`, `image: ImageRef?` | media |
| `richText` | `heading?`, `body: RichText`, `width: 'narrow'|'wide'` | — |
| `serviceGrid` | `heading`, `intro?`, `source: 'all'|'featured'|'manual'`, `services: [id]` (manual), `layout: 'bento'|'list'` | services |
| `projectShowcase` | `heading`, `intro?`, `source: 'featured'|'manual'|'all'`, `projects: [id]`, `showFilters: Boolean`, `limit 1–24` | projects, taxonomies |
| `testimonials` | `heading`, `source: 'featured'|'manual'`, `items: [id]` | testimonials; **not rendered when no published testimonials match** |
| `stats` | `heading?`, `items: [{ value ≤ 12, label ≤ 60, footnote? }]` (2–4) | — (admin form warns that figures must be verified; placeholders block publish) |
| `featureList` | `heading`, `intro?`, `items: [{ icon?, title ≤ 80, text ≤ 300 }]` (1–12), `columns: 2|3|4` | — |
| `processSteps` | `heading`, `steps: [{ title, text }]` (2–8) | — |
| `splitContent` | `heading`, `body: RichText`, `image: ImageRef`, `imagePosition: 'left'|'right'`, `cta: Link?` | media |
| `ctaBanner` | `heading`, `text?`, `primaryCta: Link`, `secondaryCta: Link?` | — |
| `faq` | `heading`, `items: [{ question, answer: RichText }]` (1–15) | — (emits FAQPage JSON-LD) |
| `engagementModels` | `heading`, `intro?`, `models: [{ name, description, priceDisplay? ≤ 40, features: [String], cta: Link, highlighted }]` (1–4) | — (replaces a pricing collection, D-016) |
| `contactForm` | `heading`, `intro?`, `showContactDetails: Boolean`, `showMap: Boolean` | settings.contact, settings.leadForm |
| `jobList` | `heading`, `intro?`, `emptyText` | jobOpenings |
| `clientLogos` | `heading?`, `logos: [{ image: ImageRef, name, url? }]` (max 24) | media (**client permission required**) |

---

## 5. Top-level slug namespace and reserved slugs (D-038)
Service pages (`/<slug>`) and custom pages (`/<slug>`) share **one namespace**. A slug must be unique across `services` and `pages`, and may not be:
`admin`, `api`, `services`, `portfolio`, `careers`, `contact`, `about`, `privacy-policy`, `terms`, `preview`, `assets`, `uploads`, `media`, `sitemap.xml`, `robots.txt`, `favicon.ico`, `404`, or any path with an active redirect.
System pages own their fixed paths (`/`, `/about`, `/services`, `/portfolio`, `/careers`, `/contact`, `/privacy-policy`, `/terms`).
The reserved list lives in `shared/` so client and server agree.

## 6. Relationship map

```
admins 1──* sessions
admins 1──* auditLogs (actor) ; admins 1──* media (uploadedBy) ; admins 1──* leads.notes
settings ──(ImageRef)──▶ media ; settings.navigation/footer ──(Link.entity)──▶ pages/services/projects/jobs
pages.sections ──▶ services / projects / testimonials / jobOpenings / media   (via entityRefs, mediaRefs)
services *──* taxonomies(technology) ; services *──* projects (relatedProjects)
projects *──1 taxonomies(projectCategory) ; projects *──* taxonomies(technology) ; projects *──* services
testimonials *──0..1 projects
leads *──0..1 services
redirects  (standalone; slug-change entries created by the publish service)
revisions *──1 (any publishable entity)
```

**Referential integrity** is enforced by services, not the database:
- Deleting a referenced entity, taxonomy or media item returns 409 `IN_USE` with the list of referencing documents.
- Publishing content that references unpublished entities returns 409 `REFERENCE_NOT_PUBLISHED`.
- Archiving a referenced entity is allowed. Public renderers silently skip unpublished references, and the dashboard flags the affected pages.

## 7. Deletion policy
| Item | Allowed | Behaviour |
|---|---|---|
| System pages | Never | Archive is not available either; they can be edited |
| Pages, services, projects, testimonials, jobs | Only when `status` is `draft` or `archived` and `IN_USE` checks pass | Hard delete; its revisions are deleted; audit entry kept. The UI asks for the title to be typed to confirm. |
| Media | Only when unreferenced (§3.10) | Deletes storage objects, then the document |
| Taxonomies | Only when unreferenced | |
| Leads | Yes (erasure) | Hard delete; audit entry without PII |
| Admins | Disable (preferred) or delete; never self; never the last active admin | Sessions revoked |
| Audit logs, revisions | Not via API | Retention pruning only |

## 8. Migrations & seeding
- **No legacy data migration** (D-002).
- `npm run seed` is **idempotent**: it upserts system pages, the five known services (indexed snippet text, where it exists, is seeded together with a `[CONFIRM VERIFIED COPY]` token so it can't be published until checked against the source), the eight portfolio project names (as drafts with `[CONFIRM …]` placeholders), the three categories, settings with placeholders and the `orderings` documents. It creates **no redirects**: legacy URLs are preserved (D-038). It **never deletes or overwrites** documents that already exist unless run with `--reset-dev`, which refuses to run when `NODE_ENV=production`.
- Schema evolution happens through additive changes plus versioned, idempotent scripts in `server/src/cli/migrations/`.
