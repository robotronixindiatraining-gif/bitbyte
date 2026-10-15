# API Reference (v1)

| | |
|---|---|
| **Status** | Stage 02 specification. Proposed contract, awaiting approval. Implemented in Stages 04–05. A contract test will keep this file and the routes in sync. |
| **Base URL** | `/api/v1` (same origin as the website) |
| **Format** | JSON (`Content-Type: application/json`), except media upload (`multipart/form-data`) and lead export (`text/csv`) |

---

## 1. Conventions

### 1.1 Response envelope
```json
// success (single)
{ "data": { … } }
// success (list)
{ "data": [ … ], "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.",
             "details": [ { "path": "draft.title", "message": "Required" } ],
             "requestId": "0f6c2c9e-…" } }
```

### 1.2 Status codes and error codes
| HTTP | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON, wrong content type |
| 401 | `UNAUTHENTICATED` | No valid session on `/admin/*` or `/auth/session` |
| 401 | `INVALID_CREDENTIALS` | Login failed (generic: doesn't reveal whether the e-mail exists) |
| 403 | `FORBIDDEN` | Authenticated but not permitted (non-`super_admin`; reserved for future safety) |
| 403 | `ORIGIN_REJECTED` | State-changing request from a disallowed `Origin`/`Referer` |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Admin must change password before other actions |
| 404 | `NOT_FOUND` | Unknown resource, or an unpublished one on public routes |
| 409 | `EDIT_CONFLICT` | `revision` mismatch (someone saved first) |
| 409 | `SLUG_TAKEN` | Slug already used or reserved |
| 409 | `IN_USE` | Delete blocked by references (`details` lists them) |
| 409 | `PLACEHOLDERS_PRESENT` | Publish blocked by `[CONFIRM …]` tokens (`details` lists field paths) |
| 409 | `REFERENCE_NOT_PUBLISHED` | Publish blocked by unpublished references |
| 409 | `CONSENT_REQUIRED` | Publishing a testimonial/project without recorded consent or permission |
| 409 | `INVALID_STATE` | e.g. deleting a published item, disabling yourself |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 200 KB or upload > limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Upload isn't an allowed image type (checked by magic bytes) |
| 422 | `VALIDATION_ERROR` | Schema validation failed (`details[]` with paths) |
| 429 | `RATE_LIMITED` | Limit hit; `Retry-After` header set. Also used for login lockout (generic). |
| 500 | `INTERNAL_ERROR` | Unexpected; message is generic, details logged with `requestId` |
| 503 | `SERVICE_UNAVAILABLE` | Database unavailable |

### 1.3 Validation
- zod schemas from `shared/`, **strict**: unknown keys → 422. Applies to body, path params (ObjectId / slug pattern) and query (whitelisted filters only).
- Strings are trimmed. Rich text is sanitised server-side **after** validation. Plain-text fields are stored as text and escaped at render.
- Mass assignment is impossible: services build updates from validated fields only. `_id`, `revision`, `status`, `mediaRefs`, `placeholders`, timestamps and `createdBy` are never accepted from clients.

### 1.4 Pagination, sorting, filtering (list endpoints)
`?page=1&limit=20` (limit max 100). `?sort=order|-updatedAt|title` from an allowlist per endpoint. Filters are named per endpoint (e.g. `status`, `category`, `q`).

### 1.5 Caching
- Public GETs: `Cache-Control: public, max-age=60, stale-while-revalidate=300` plus `ETag`. Publish actions invalidate the server's in-memory cache.
- Auth and admin responses: `Cache-Control: no-store`.

### 1.6 Concurrency
Every draft write includes `"revision": <number>` (the value last read). The server applies the write only if it matches, then returns the new `revision`. On mismatch: `409 EDIT_CONFLICT` with `details: { currentRevision, updatedBy, updatedAt }`. The admin UI then offers "reload" or "copy my changes".

---

## 2. Authentication & security model

| Aspect | Design |
|---|---|
| Accounts | `admins` collection only; role is always `super_admin`. **No public registration, login or accounts.** The first admin is created with the CLI (`npm run admin:create`). |
| Password hashing | argon2id (memory 19 MiB, iterations 2, parallelism 1, the OWASP baseline; tunable in config). Minimum length 12, maximum 128; checked against a small common-password list; no composition rules. |
| Session | 256-bit random token in cookie `__Host-bb_sid` (production): `HttpOnly; Secure; SameSite=Strict; Path=/`. Server stores only the SHA-256 hash. **Idle timeout 2 h, absolute 12 h.** A new token is issued on login; all sessions are revoked on password change or disable. |
| CSRF | `SameSite=Strict` + **Origin/Referer allowlist** on every non-GET request to `/auth` and `/admin` + JSON-only bodies + required `X-Requested-With: fetch` header (forces a CORS preflight for cross-site attempts). |
| Authorisation | `requireSuperAdmin` middleware mounted on the **whole `/admin` router**. It checks session validity, `admin.status === 'active'` and `admin.role === 'super_admin'`. The frontend guard is UX only. |
| Brute force | Login limiter: **5 attempts per 15 min per IP+email**, 20 per hour per IP. After 10 consecutive failures the account locks for 15 min, doubling up to 24 h. Response is always generic. |
| Other limits | Public API 120 req/min/IP · lead submissions 5/hour/IP and 20/day/IP · admin API 600 req/5 min/session · uploads 30/10 min/session |
| Two-factor | **Recommended, pending decision D-026:** TOTP for `super_admin` (endpoints marked ⓣ below). |
| Password recovery | No public "forgot password" at launch (D-027). Recovery is by another super admin (`POST /admin/administrators/:id/reset-password`) or the server CLI (`npm run admin:reset-password`). |
| Audit | Every login (success and failure), logout, publish, delete, settings change, lead status change/export/erasure and admin change is written to `auditLogs`. |

---

## 3. Public endpoints (no authentication; published content only)

All responses project `published` content only. Unpublished, archived and expired items return **404**, indistinguishable from non-existent ones.

### 3.1 `GET /api/v1/health`
`200 { "data": { "status": "ok", "db": "up" } }` · `503` when the DB is down. No version or host information.

### 3.2 `GET /api/v1/public/site`
Global settings bundle for the layout: `general`, `contact`, `navigation`, `footer`, `social`, `seo` (public parts), `leadForm` (without `notificationEmails`), `integrations` (public keys only). Entity links are resolved to current paths.
```json
{ "data": {
  "general": { "companyName": "…", "tagline": "…", "logo": { "url": "…", "alt": "…", "width": 240, "height": 48, "variants": [] } },
  "contact": { "addressLines": ["402, 4th floor, Atulya IT Park", "MPIDC, Khandwa Road"], "city": "Indore", "region": "M.P.", "postalCode": "452001",
               "phones": [{ "label": "Office", "number": "…", "whatsapp": false }], "emails": [{ "label": "General", "address": "…" }] },
  "navigation": { "header": [{ "label": "Services", "href": "/services", "children": [{ "label": "Internet of Things", "href": "/services/internet-of-things" }] }],
                  "cta": { "label": "…", "href": "/contact" } },
  "footer": { "columns": [], "copyrightHolder": "…", "bottomLinks": [] },
  "social": { "profiles": [] },
  "leadForm": { "budgetOptions": ["…"], "consentText": "…", "successMessage": "…" },
  "integrations": { "turnstileSiteKey": null }
} }
```
(Values shown as `…` come from the CMS; nothing is hardcoded.)

### 3.3 Pages
`GET /api/v1/public/pages/:slug`. Use `home` for the homepage.
```json
{ "data": { "slug": "about", "template": "about", "title": "…",
  "sections": [
    { "key": "s1", "type": "hero", "anchorId": null, "variant": { "background": "dark", "spacing": "default" },
      "data": { "eyebrow": "…", "heading": "…", "highlight": "…", "subheading": "…",
                "primaryCta": { "label": "…", "href": "/contact" }, "visual": "bitgrid" } },
    { "key": "s2", "type": "serviceGrid", "variant": { "background": "light", "spacing": "default" },
      "data": { "heading": "…", "layout": "bento",
                "items": [ { "slug": "internet-of-things", "title": "Internet of Things", "summary": "…", "icon": "cpu" } ] } }
  ],
  "seo": { "title": "…", "description": "…", "canonical": "https://www.bitbyteindia.com/about", "ogImage": { "url": "…" }, "noindex": false }
} }
```
Only `visible: true` sections are returned. Referenced entities are **embedded already resolved** (published ones only), so a page needs one request.

### 3.4 Services
- `GET /api/v1/public/services` → `[{ slug, title, navLabel, summary, icon, featured }]`, ordered by `order`. Query: `featured=true`.
- `GET /api/v1/public/services/:slug` → full published service (offerings, industries, process, technologies `{ name, slug }`, faqs, relatedProjects as cards, cta, seo).

### 3.5 Projects & taxonomies
- `GET /api/v1/public/projects?category=<slug>&technology=<slug>&featured=true&page=&limit=` → cards `{ slug, title, summary, category{ name, slug }, technologies[], cover{ url, alt, width, height, variants, dominantColor }, year }`.
- `GET /api/v1/public/projects/:slug` → full case study (client name only if `showName`).
- `GET /api/v1/public/taxonomies?type=projectCategory|technology` → only taxonomies used by at least one published project/service.

### 3.6 Testimonials
`GET /api/v1/public/testimonials?featured=true` → `[{ quote, authorName, authorRole, company, photo, project{ slug, title } }]`. Returns `[]` (not an error) when none are published.

### 3.7 Jobs
- `GET /api/v1/public/jobs` → open jobs (`closesAt` null or in the future).
- `GET /api/v1/public/jobs/:slug` → job detail + JobPosting data.

### 3.8 Leads (contact form)
`POST /api/v1/public/leads`. Rate-limited, origin-checked, `X-Requested-With` required.
```json
// request
{ "type": "project_enquiry",
  "fullName": "Asha Verma", "companyName": "Example Pvt Ltd", "companyLocation": "Indore",
  "email": "asha@example.com", "phone": "+91 98xxxxxxx", "budget": "<one of settings.leadForm.budgetOptions>",
  "message": "We need …", "service": "internet-of-things",
  "consent": true, "sourcePath": "/services/internet-of-things",
  "utm": { "source": "google" },
  "website": "",                 // honeypot — must be empty
  "formStartedAt": 1760520000000, // client timestamp; submissions faster than 3 s are flagged
  "turnstileToken": null          // required only when Turnstile is enabled (D-020)
}
// 201
{ "data": { "received": true, "message": "<settings.leadForm.successMessage>" } }
```
- Validation errors → 422 with field paths (shown inline by the form).
- Honeypot filled or Turnstile failed → **201 with the same body** (doesn't teach bots), stored as `status: 'spam'` for review in the "Possible spam" view.
- The consent text shown is copied server-side from published settings, not trusted from the client.
- No lead data is ever returned by a public endpoint.

### 3.9 SEO files (not under `/api`)
`GET /sitemap.xml` · `GET /robots.txt` (`Disallow: /admin`, `Disallow: /api`, `Sitemap:` line).

---

## 4. Auth endpoints

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/login` | — (rate-limited) | `{ email, password }` → sets cookie, `200 { data: { admin: { id, name, email, role, mustChangePassword } } }`. ⓣ If 2FA is enabled: `200 { data: { twoFactorRequired: true, challengeId } }` |
| `POST /api/v1/auth/login/2fa` ⓣ | challenge | `{ challengeId, code }` → completes login |
| `POST /api/v1/auth/logout` | session | Revokes the current session, clears the cookie → `204` |
| `GET /api/v1/auth/session` | session | Current admin or `401` |
| `POST /api/v1/auth/change-password` | session | `{ currentPassword, newPassword }` → revokes other sessions → `204` |
| `GET /api/v1/auth/sessions` | session | The admin's active sessions (created, last seen, user agent) |
| `DELETE /api/v1/auth/sessions/:id` | session | Revoke one session ("sign out other device") |

Login example error: `401 { "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }`.

---

## 5. Admin endpoints (`/api/v1/admin/*`, session + `super_admin` required on every route)

### 5.1 Uniform pattern for publishable collections
Applies to `pages`, `services`, `projects`, `testimonials` and `jobs` (resource name in the path):

| Method & path | Body | Result |
|---|---|---|
| `GET /admin/{res}?status=&q=&page=&limit=&sort=` | — | List with `{ id, title, slug, status, hasUnpublishedChanges, placeholders, order, updatedAt, updatedBy }` |
| `POST /admin/{res}` | `{ draft }` | Create (status `draft`) → `201 { data: { id, revision: 1, … } }` |
| `GET /admin/{res}/:id` | — | Full document: `draft`, `published`, `revision`, status fields, `placeholders`, `references` (where it's used) |
| `PUT /admin/{res}/:id/draft` | `{ revision, draft }` | Save draft (lenient schema, so incomplete drafts are allowed) → `{ revision }` · 409 `EDIT_CONFLICT` |
| `POST /admin/{res}/:id/publish` | `{ revision, note? }` | Strict validation + placeholder/reference/consent checks → live · 409/422 on failure |
| `POST /admin/{res}/:id/unpublish` | `{ revision }` | `status → archived` |
| `POST /admin/{res}/:id/discard-draft` | `{ revision }` | Reset `draft` to `published` |
| `GET /admin/{res}/:id/revisions` | — | `[{ revision, publishedAt, publishedBy, note }]` |
| `POST /admin/{res}/:id/revisions/:rev/restore` | `{ revision }` | Copies the snapshot into the draft (not published) |
| `PATCH /admin/{res}/order` | `{ ids: [id…] }` | Reorders the listing (applies immediately, D-025) |
| `DELETE /admin/{res}/:id` | — | Only `draft`/`archived` and unreferenced → `204` · 409 `IN_USE`/`INVALID_STATE` |

Extra fields per resource:
- **projects:** `PUT /admin/projects/:id/permission` `{ confirmed, note }`. Records client permission (date set by the server).
- **testimonials:** `PUT /admin/testimonials/:id/consent` `{ confirmed, method, note }`.
- **pages:** system pages reject `DELETE` and slug changes; `POST /admin/pages` creates `custom` pages only.

Example publish failure:
```json
409 { "error": { "code": "PLACEHOLDERS_PRESENT",
  "message": "Replace all [CONFIRM …] placeholders before publishing.",
  "details": [ { "path": "draft.summary", "token": "[CONFIRM PORTFOLIO PROJECT DETAILS]" } ] } }
```

### 5.2 Preview
| Method & path | Result |
|---|---|
| `GET /admin/preview/pages/:id` | Same shape as `GET /public/pages/:slug`, built from **drafts** (the page and the entities it references, so preview shows everything as if published now) |
| `GET /admin/preview/services/:id` · `/projects/:id` · `/jobs/:id` | Same as the matching public detail endpoint, from the draft |
| `GET /admin/preview/site` | Site bundle from **draft** settings |

Preview responses send `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

### 5.3 Settings
| Method & path | Body |
|---|---|
| `GET /admin/settings` | All keys with status fields |
| `GET /admin/settings/:key` | One key (`general`, `contact`, `navigation`, `footer`, `social`, `seo`, `leadForm`, `integrations`) |
| `PUT /admin/settings/:key/draft` | `{ revision, draft }` |
| `POST /admin/settings/:key/publish` | `{ revision }` |
| `GET /admin/settings/:key/revisions` · `POST …/revisions/:rev/restore` | |

### 5.4 Taxonomies
`GET /admin/taxonomies?type=` · `POST /admin/taxonomies` `{ type, name, slug? }` · `PATCH /admin/taxonomies/:id` `{ name, slug }` · `PATCH /admin/taxonomies/order` · `DELETE /admin/taxonomies/:id` (409 `IN_USE`).

### 5.5 Media
| Method & path | Notes |
|---|---|
| `POST /admin/media` | `multipart/form-data`: `file` (one image, ≤ **10 MB**, JPEG/PNG/WebP/AVIF verified by magic bytes; **no SVG/GIF/HEIC**), `alt`, `decorative`, `folder`, `caption?`, `credit?`, `licence?`. Server re-encodes with sharp (strips EXIF/GPS), creates variants, stores them, returns `201 { data: media }`. Max 12 000 × 12 000 px. Duplicate checksum → `200` with `duplicateOf` |
| `GET /admin/media?q=&folder=&page=&limit=` | Library listing |
| `GET /admin/media/:id` | Includes `usage: [{ kind, id, title, state: 'draft'|'published' }]` |
| `PATCH /admin/media/:id` | `{ alt, decorative, caption, credit, licence, folder, tags }`. Alt changes apply to all usages immediately. |
| `DELETE /admin/media/:id` | `409 IN_USE` with the usage list, or `204` |

### 5.6 Leads
| Method & path | Notes |
|---|---|
| `GET /admin/leads?status=&type=&q=&from=&to=&page=&limit=` | `q` searches name/company/email |
| `GET /admin/leads/:id` | Full lead + notes + notification status |
| `PATCH /admin/leads/:id` | `{ status }` (enum from `DATABASE_SCHEMA.md` §3.11) |
| `POST /admin/leads/:id/notes` | `{ text }` |
| `POST /admin/leads/:id/resend-notification` | Retries the e-mail |
| `GET /admin/leads/export.csv?…filters` | CSV (formula-injection-safe: cells starting with `= + - @` are prefixed with `'`); audited |
| `DELETE /admin/leads/:id` | Erasure; requires `{ "confirm": "DELETE" }`; audited without PII |

### 5.7 Redirects
`GET /admin/redirects` · `POST /admin/redirects` `{ fromPath, toPath, statusCode }` · `PATCH /admin/redirects/:id` · `DELETE /admin/redirects/:id`. Validation rejects loops, chains, reserved prefixes and duplicate `fromPath`.

### 5.8 Administrators (all `super_admin`; D-004)
| Method & path | Notes |
|---|---|
| `GET /admin/administrators` | `[{ id, name, email, status, lastLoginAt, twoFactorEnabled }]` |
| `POST /admin/administrators` | `{ name, email, temporaryPassword }` → `mustChangePassword: true`. Role is always `super_admin` and isn't accepted from input. |
| `PATCH /admin/administrators/:id` | `{ name, status }`. Can't disable self or the last active admin. |
| `POST /admin/administrators/:id/reset-password` | `{ temporaryPassword }` → revokes that admin's sessions |
| `POST /admin/administrators/:id/revoke-sessions` | |
| ⓣ `POST /admin/account/2fa/setup` · `/enable` · `/disable` | Only if D-026 is approved |

### 5.9 Dashboard & audit
- `GET /admin/dashboard` → `{ leads: { new, last30Days }, unpublishedChanges: [ … ], placeholders: [{ kind, id, title, count }], brokenReferences: [ … ], recentActivity: [ … ] }`.
- `GET /admin/audit-logs?actor=&action=&entityType=&from=&to=&page=` (read-only).

---

## 6. Endpoint security matrix

| Prefix | Session | Role | Origin check | Rate limit | Returns drafts |
|---|:-:|:-:|:-:|---|:-:|
| `/api/v1/health` | — | — | — | public | — |
| `/api/v1/public/*` GET | — | — | — | 120/min/IP | **Never** |
| `/api/v1/public/leads` POST | — | — | ✓ | 5/h/IP | — |
| `/api/v1/auth/login` | — | — | ✓ | 5/15 min/IP+email | — |
| `/api/v1/auth/*` (other) | ✓ | `super_admin` | ✓ (non-GET) | admin | — |
| `/api/v1/admin/*` | ✓ | `super_admin` | ✓ (non-GET) | admin / uploads | ✓ |
