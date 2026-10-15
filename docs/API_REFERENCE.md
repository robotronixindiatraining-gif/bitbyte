# API Reference (v1)

| | |
|---|---|
| **Status** | Approved contract, **implemented through Stage 05** (every endpoint below; ✅ marks endpoints since Stage 04). The admin route table (`server/src/routes/admin/`) drives the security tests (401/403 on every route), and `server/test/contract.test.js` fails if a route is missing from this document (Appendix A). |
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
| 409 | `EMAIL_TAKEN` | An administrator with this e-mail already exists |
| 409 | `IN_USE` | Delete blocked by references (`details` lists them) |
| 409 | `PLACEHOLDERS_PRESENT` | Publish blocked by `[CONFIRM …]` tokens (`details` lists field paths) |
| 409 | `REFERENCE_NOT_PUBLISHED` | Publish blocked by unpublished references |
| 409 | `CONSENT_REQUIRED` | Publishing a testimonial/project without recorded consent or permission |
| 409 | `INVALID_STATE` | e.g. deleting a published item, disabling yourself, unpublishing a system page |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 200 KB or upload > limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Upload isn't an allowed image type (checked by magic bytes) |
| 403 | `STEP_UP_REQUIRED` | Sensitive action without a password + TOTP re-authentication in the last 5 min (D-039) |
| 403 | `MFA_ENROLLMENT_REQUIRED` | Restricted session (2FA not yet enrolled) calling anything except enrolment, change-password or logout |
| 422 | `VALIDATION_ERROR` | Schema validation failed (`details[]` with paths) |
| 422 | `CAPTCHA_FAILED` | Turnstile token missing, invalid, expired or already used (D-020) |
| 401 | `INVALID_MFA_CODE` | Wrong TOTP or recovery code (generic; counts towards lockout) |
| 429 | `RATE_LIMITED` | Request-rate limit hit; `RateLimit`/`Retry-After` headers set. (A **locked account** answers with the generic `401 INVALID_CREDENTIALS` instead, so lockout never reveals that an account exists.) |
| 500 | `INTERNAL_ERROR` | Unexpected; message is generic, details logged with `requestId` |
| 503 | `SERVICE_UNAVAILABLE` | A required dependency is unavailable (database down, audit log not writable, authentication secrets not configured, media provider down or not configured, contact form not configured) |

### 1.3 Validation
- zod schemas from `shared/`, **strict**: unknown keys → 422. Applies to body, path params (ObjectId / slug pattern) and query (whitelisted filters only).
- Strings are trimmed. Rich text is sanitised server-side **after** validation. Plain-text fields are stored as text and escaped at render.
- Mass assignment is impossible: services build updates from validated fields only. `_id`, `revision`, `status`, `mediaRefs`, `placeholders`, timestamps and `createdBy` are never accepted from clients.

### 1.4 Pagination, sorting, filtering (list endpoints)
`?page=1&limit=20` (limit max 100). `?sort=-updatedAt|updatedAt|title` on the content lists (order itself is managed through `/admin/orderings`). Filters are named per endpoint (e.g. `status`, `category`, `q`); unknown query parameters → 422. `q` is matched literally (regular-expression characters are escaped). List responses carry `meta: { page, limit, total, totalPages }`.

### 1.5 Caching
- Public GETs: `Cache-Control: public, max-age=60, stale-while-revalidate=300` plus `ETag`. The server keeps a small in-memory cache of public reads; **every admin write clears it** (before and after the write), so unpublishing takes effect immediately on this server.
- Auth, admin, preview and lead responses: `Cache-Control: no-store`. Every `/api` response carries `X-Robots-Tag: noindex`.

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
| Brute force | Login limiter: **5 attempts per 15 min per IP+email**, 20 per hour per IP. Second-factor endpoints: 30 per 15 min per IP, plus max 5 codes per pending sign-in. After 10 consecutive failures (password or code) the account locks for 15 min, doubling up to 24 h. Responses are always generic, and unknown e-mails cost the same argon2 work as real ones. |
| Other limits | Public API 120 req/min/IP · lead submissions 5/hour/IP and 20/day/IP · admin API 600 req/5 min/session · uploads 30/10 min/session (all in-memory, single instance) |
| Two-factor | **Mandatory TOTP** for every `super_admin` (D-026), plus 10 single-use recovery codes. A session is only fully active after the second factor; before enrolment it is **restricted** (D-039). |
| Step-up | Sensitive actions (marked **⇑** below) require password + TOTP re-authentication within the last 5 minutes (`POST /auth/step-up`): administrator changes, lead export and erasure, and publishing the `privacy` or `leadForm` settings (retention periods and notification recipients govern personal data) |
| Password & 2FA recovery | No e-mail reset links (D-027). Recovery goes through another super admin (with step-up) or the server CLI. Password and 2FA are never reset by one action; every reset is audited and notified (D-039). |
| Bot protection | Public forms require a Turnstile token **verified server-side** (D-020) |
| Audit | Every login (success and failure), logout, create/save/publish/unpublish/restore/delete, consent/permission change, media upload/update/delete, taxonomy and redirect change, lead status change/note/export/erasure, retention purge and admin change is written to `auditLogs`. Publish, unpublish, restore, delete, media, redirect, lead export/erasure and admin actions are **fail-closed** (D-045): if the entry cannot be written, the action does not happen (503). Audit entries never contain lead names, contact details or messages. |

---

## 3. Public endpoints (no authentication; published content only)

All responses project `published` content only. Unpublished, archived and expired items return **404**, indistinguishable from non-existent ones. References are resolved through the same filter: a reference to anything that is not live (an unpublished service in a grid, a link to an archived page, a project without client permission, a testimonial without consent, an expired job) is **silently dropped**, never rendered as a dead link and never revealed. Public reads load only the `published` snapshot and public fields from MongoDB (`server/src/services/resolver.js`).

### 3.1 Health (D-041)
- ✅ `GET /api/v1/health` (**liveness**) → `200 { "data": { "status": "ok", "db": "up" | "connecting" | "down" | "disabled" } }` while the process serves requests.
- ✅ `GET /api/v1/health/ready` (**readiness**) → `200 { "data": { "status": "ready", "db": "up" } }`, or `503 SERVICE_UNAVAILABLE` when the database isn't connected.
- Neither exposes version, host or configuration information. Both are implemented in Stage 03.

### 3.2 `GET /api/v1/public/site`
`GET /public/site`: global settings bundle for the layout: `general`, `contact`, `navigation`, `footer`, `social`, `seo` (public parts: `titleTemplate`, `defaultDescription`, `defaultOgImage`, `searchConsoleToken`), `leadForm` (without `notificationEmails`), `careers` (application method), `integrations` (public keys only). Unpublished settings keys are `null`. Entity links are resolved to current paths; links to unpublished targets are dropped. `privacy` is never included.
```json
{ "data": {
  "general": { "companyName": "…", "tagline": "…", "logo": { "url": "…", "alt": "…", "width": 240, "height": 48, "variants": [] } },
  "contact": { "addressLines": ["402, 4th floor, Atulya IT Park", "MPIDC, Khandwa Road"], "city": "Indore", "region": "M.P.", "postalCode": "452001",
               "phones": [{ "label": "Office", "number": "…", "whatsapp": false }], "emails": [{ "label": "General", "address": "…" }] },
  "navigation": { "header": [{ "label": "Services", "href": "/services", "children": [{ "label": "Internet of Things", "href": "/internet-of-things" }] }],
                  "cta": { "label": "…", "href": "/contact" } },
  "footer": { "columns": [], "copyrightHolder": "…", "bottomLinks": [] },
  "social": { "profiles": [] },
  "leadForm": { "budgetOptions": ["…"], "consentText": "…", "successMessage": "…" },
  "integrations": { "turnstileSiteKey": null }
} }
```
(Values shown as `…` come from the CMS; nothing is hardcoded.)

### 3.3 Pages
`GET /public/pages/:slug`. Use `home` for the homepage.
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
Only visible sections are returned (`visible: false` is hidden). Referenced entities are **embedded already resolved** (published ones only), so a page needs one request: `serviceGrid.items`, `projectShowcase.items` (+ `categories` when `showFilters`), `testimonials.items`, `jobList.items` (open jobs), images as `{ url, alt, decorative, width, height, dominantColor, variants: [{ width, url }] }`, links as `{ label, href, external, openInNewTab }`.

### 3.4 Services
- `GET /public/resolve?path=/cms-development` → `{ kind: 'page' | 'service' | 'project' | 'job' | 'redirect' | 'not_found', slug, path, location?, statusCode? }`. Resolves a path in the order service → page (system or custom) at the top level, `/portfolio/:slug`, `/careers/:slug`, then stored redirects (D-038). The server uses the same resolver for the HTML response, so the client rarely needs this call.
- ✅ `GET /public/services` → `[{ slug, path, title, navLabel, summary, icon, featured }]`, in the **published** `orderings.services` order (D-037); unlisted items follow, newest first. `path` is the top-level URL (e.g. `/cms-development`). Query: `featured=true`.
- ✅ `GET /public/services/:slug` → the published service with `heroImage`, `intro`, `offerings`, `industries`, `process`, `technologies[{ name, slug }]`, `faqs`, `relatedProjects` (project cards), `cta`, and `seo { title, description, canonical, ogImage, noindex }`.

### 3.5 Projects & taxonomies
- `GET /public/projects?category=<slug>&technology=<slug>&featured=true&page=&limit=` (limit ≤ 48) → cards `{ slug, path, title, summary, category{ name, slug }, technologies[], cover{ url, alt, width, height, variants, dominantColor }, year, featured }` with `meta`. Only projects with recorded client permission.
- `GET /public/projects/:slug` → full case study (client name only if `showName`), gallery, services, `seo`.
- `GET /public/taxonomies?type=projectCategory|technology` → only taxonomies used by at least one published project (categories, in the published category order) or project/service (technologies).

### 3.6 Testimonials
`GET /public/testimonials?featured=true` → `[{ quote, authorName, authorRole, company, photo, project{ slug, title, path }, featured }]`, consented testimonials only. Returns `[]` (not an error) when none are published.

### 3.7 Jobs
- `GET /public/jobs` → open jobs (`closesAt` null or in the future), in the published order.
- `GET /public/jobs/:slug` → job detail with `postedAt`, `application { method, email, url }` from the published careers settings, and `seo`. The HTML response adds `JobPosting` JSON-LD.

### 3.8 Leads (contact form)
`POST /public/leads`. Rate-limited (5/hour and 20/day per IP), origin-checked, `X-Requested-With: fetch` required, JSON body ≤ 16 KB (larger → 413). **The form fields are provisional** until the original site's form is verified (CONTENT_GAPS CG-20).
```json
// request
{ "type": "project_enquiry",
  "fullName": "Asha Verma", "companyName": "Example Pvt Ltd", "companyLocation": "Indore",
  "email": "asha@example.com", "phone": "+91 98xxxxxxx", "budget": "<one of settings.leadForm.budgetOptions>",
  "message": "We need …", "service": "internet-of-things",
  "consent": true, "sourcePath": "/internet-of-things",
  "utm": { "source": "google" },
  "website": "",                 // honeypot — must be empty
  "formStartedAt": 1760520000000, // client timestamp; submissions faster than 3 s are flagged
  "turnstileToken": "<token from the Turnstile widget>"  // required; verified server-side (D-020)
}
// 201
{ "data": { "received": true, "message": "<settings.leadForm.successMessage>" } }
```
- Validation errors → 422 with field paths (shown inline by the form). Text is trimmed and whitespace-collapsed; control characters are rejected; e-mail is lower-cased; unknown fields → 422. `budget` must be one of the published `leadForm.budgetOptions`; `service` is linked only if it names a published service.
- **Turnstile** (D-020): the server calls Cloudflare `siteverify` (secret, `remoteip`, `idempotency_key`) and checks `success`, `hostname` and `action: "lead"` (in production strictly; outside production only when Cloudflare returns them, because the documented test keys do not). Missing/invalid/expired/reused token → `422 CAPTCHA_FAILED` and nothing is stored. Tokens are also remembered locally for 10 minutes, so a replay fails without a Cloudflare call. Cloudflare unreachable → the lead is stored with `spamSignals.turnstile: "unverified"` and listed under "Possible spam".
- Honeypot (`website`) filled → **201 with the same body** (doesn't teach bots), stored as `status: 'spam'` (30-day retention), no Turnstile call, no notification. Filled in under 3 s → stored normally with `spamSignals.tooFast: true` ("Possible spam").
- Not available → **503**: the `leadForm` settings are not published, or `TURNSTILE_SECRET_KEY` is not configured.
- Each lead gets `expiresAt` from the published retention setting (default 365 days, spam 30 days; D-032).
- The consent text stored is copied server-side from published settings, not trusted from the client.
- The notification e-mail is sent in the background (it never delays or fails the response) and contains no personal data (D-052).
- No lead data is ever returned by a public endpoint, and logs record only the lead id and outcome.

### 3.9 SEO files and HTML (not under `/api`)
- `GET /sitemap.xml`: published, indexable pages, services, projects and open jobs (`<loc>` absolute from `PUBLIC_SITE_URL`, `<lastmod>`). Items with `seo.noindex` are left out.
- `GET /robots.txt`: with `ROBOTS_ALLOW_INDEXING=true` **in production**: `Disallow: /admin`, `Disallow: /api` and the `Sitemap:` line. Everywhere else (development, staging, production before launch): `Disallow: /` (D-050).
- Every other `GET` outside `/api` returns the built client's `index.html` with per-route `<title>` (settings `titleTemplate`), description, canonical, robots, Open Graph/Twitter tags, JSON-LD (Organization on the homepage, Service, JobPosting) and an escaped bootstrap JSON block, with a **real status**: 200, 301/302 (stored redirects), 404 (unknown or unpublished, `noindex`) or 503 (database unavailable, `noindex`, `Retry-After`). `/admin/*` always gets `noindex` and `no-store`. See `ARCHITECTURE.md` §6.

---

## 4. Auth endpoints

| Method & path | Auth | Purpose |
|---|---|---|
| ✅ `POST /api/v1/auth/login` | — (rate-limited) | `{ email, password }`. Never creates a full session. Enrolled admin → cookie for an `mfa_pending` session (5 min, single use) and `200 { data: { stage: "mfa_pending" } }`. Not yet enrolled → cookie for a **restricted** `enrollment` session and `200 { data: { stage: "enrollment" } }` |
| ✅ `POST /api/v1/auth/login/verify` | `mfa_pending` session | `{ code }` (TOTP) **or** `{ recoveryCode }` → rotates the cookie to an `active` session → `200 { data: { stage: "active", admin: { id, name, email, role, mustChangePassword } } }`. Max 5 attempts; failures count towards lockout; using a recovery code is audited and e-mailed |
| ✅ `POST /api/v1/auth/2fa/enroll/start` | `enrollment`, or `active` + **⇑** for re-enrolment | Returns `{ otpauthUri, manualEntryKey, qrCodeDataUrl }` for a new pending secret (inactive until confirmed; expires after 15 min). `Cache-Control: no-store` |
| ✅ `POST /api/v1/auth/2fa/enroll/confirm` | `enrollment` or `active` | `{ code }` → activates 2FA, ends **all** of the admin's sessions and issues one new `active` session, returns `{ stage: "active", recoveryCodes: [10 codes] }` **once** |
| ✅ `POST /api/v1/auth/step-up` | `active` session | `{ password, code }` → sets `stepUpAt` (valid 5 min) |
| ✅ `POST /api/v1/auth/2fa/recovery-codes` **⇑** | `active` | Regenerates the codes (old ones invalidated), returns the new codes once |
| ✅ `POST /api/v1/auth/logout` | any or none | Revokes the current session, clears the cookie → `204` |
| ✅ `GET /api/v1/auth/session` | any stage | `{ stage, admin, stepUpValidUntil, expiresAt }` or `401` |
| ✅ `POST /api/v1/auth/change-password` | `active` (also while `mustChangePassword`) | `{ currentPassword, newPassword, code }`: the current password **and** a current TOTP code are required (inline re-authentication). Ends all sessions, sets a new session cookie → `204`. New admins enrol 2FA first, then change the temporary password |
| ✅ `GET /api/v1/auth/sessions` | `active` | The admin's active sessions (created, last seen, user agent) |
| ✅ `DELETE /api/v1/auth/sessions/:id` | `active` | Revoke one session ("sign out other device") |

Login example error: `401 { "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }`.

---

## 5. Admin endpoints (`/api/v1/admin/*`, session + `super_admin` required on every route)

### 5.1 Uniform pattern for publishable collections
Applies to `pages`, `services`, `projects`, `testimonials` and `jobs` (resource name in the path; every concrete route is listed in Appendix A):

| Method & path | Body | Result |
|---|---|---|
| `GET /admin/{res}?status=&q=&page=&limit=&sort=` | — | List with `{ id, kind, title, slug, key, template, system, status, hasUnpublishedChanges, placeholders (count), revision, updatedAt, updatedBy, publishedAt }` (+ `consentConfirmed` / `permissionConfirmed`) |
| `POST /admin/{res}` | `{ draft }` | Create (status `draft`; added to the end of the list's **draft** order) → `201 { data: document }` |
| `GET /admin/{res}/:id` | — | Full document: `draft`, `published`, `revision`, status fields, `placeholders` (tokens), `references` (where it's used) |
| `PUT /admin/{res}/:id/draft` | `{ revision, draft }` | Save draft (lenient schema, so incomplete drafts are allowed; rich text is sanitised) → document with the new `revision` · 409 `EDIT_CONFLICT` |
| `POST /admin/{res}/:id/publish` | `{ revision, note? }` | Strict validation, then in order: placeholders (409 `PLACEHOLDERS_PRESENT`), consent/permission (409 `CONSENT_REQUIRED`), page template rules (422), references live (409 `REFERENCE_NOT_PUBLISHED`), slug free (409 `SLUG_TAKEN`) → live; a revision snapshot is stored (25 kept) and a changed slug gets an automatic 301 |
| `POST /admin/{res}/:id/unpublish` | `{ revision }` | `status → archived` (system pages: 409) |
| `POST /admin/{res}/:id/discard-draft` | `{ revision }` | Reset `draft` to `published` (409 if never published) |
| `GET /admin/{res}/:id/revisions` | — | `[{ revision, publishedAt, publishedBy, note }]`, newest first |
| `POST /admin/{res}/:id/revisions/:rev/restore` | `{ revision }` | Copies the snapshot into the draft (not published; system slugs kept) |
| `DELETE /admin/{res}/:id` | — | Only `draft`/`archived` and unreferenced → `204` (revisions removed, item removed from orderings) · 409 `IN_USE`/`INVALID_STATE` |

Extra fields per resource:
- **projects:** `PUT /admin/projects/:id/permission` `{ confirmed, note? }`. Records client permission (date and admin set by the server). Withdrawing it archives a published project.
- **testimonials:** `PUT /admin/testimonials/:id/consent` `{ confirmed, method?: 'email'|'document'|'other', note? }`. Withdrawing archives a published testimonial.
- **pages:** system pages reject `DELETE`, unpublish and slug changes; `POST /admin/pages` creates `custom` pages only. Services and custom pages share one top-level slug namespace; reserved slugs (`RESERVED_SLUGS`, incl. `home`) are refused.

Unsafe links (`javascript:`, `data:`, `vbscript:`, protocol-relative) are rejected in drafts; at publish internal links must be site paths and external links `http(s)` URLs. Rich text keeps only `p br strong em u s a ul ol li h2 h3 h4 blockquote code table…` with `http(s)/mailto/tel` links (`rel="noopener noreferrer"` added).

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

Preview responses send `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`. Preview includes draft and published items but never archived ones, and still respects consent/permission and job closing dates.

### 5.2a Orderings (D-037)
Ordering changes are drafted, previewed and published; they never go live on save.

| Method & path | Body | Result |
|---|---|---|
| `GET /admin/orderings/:key` | — | `key` ∈ `services`, `projects`, `testimonials`, `jobOpenings`, `projectCategories` → document (`draft: { ids }`, `published`, `revision`, `hasUnpublishedChanges`) + `items: [{ id, title, status, inDraftOrder }]` (every item of the collection, in draft order). Created empty on first use |
| `PUT /admin/orderings/:key/draft` | `{ revision, ids: [id…] }` | Saves the draft order from drag-and-drop or move up/down (ids must belong to the collection; no duplicates; ≤ 500) |
| `POST /admin/orderings/:key/publish` | `{ revision, note? }` | Makes the order live |
| `POST /admin/orderings/:key/discard-draft` | `{ revision }` | Resets the draft to the live order |

Preview endpoints (§5.2) render listings in the **draft** order.

### 5.3 Settings
| Method & path | Body |
|---|---|
| `GET /admin/settings` | All keys with status fields |
| `GET /admin/settings/:key` | One key (`general`, `contact`, `navigation`, `footer`, `social`, `seo`, `leadForm`, `careers`, `privacy`, `integrations`) |
| `PUT /admin/settings/:key/draft` | `{ revision, draft }` |
| `POST /admin/settings/:key/publish` **⇑** (only `privacy` and `leadForm`) | `{ revision, note? }`. Publishing `privacy` recomputes every lead's `expiresAt` |
| `POST /admin/settings/:key/discard-draft` | `{ revision }` |
| `GET /admin/settings/:key/revisions` · `POST /admin/settings/:key/revisions/:rev/restore` | `{ revision }` |

Settings cannot be created, unpublished or deleted through the API (the seed creates them).

### 5.4 Taxonomies
`GET /admin/taxonomies?type=` · `POST /admin/taxonomies` `{ type, name, slug? }` (slug suggested from the name; new categories join the **draft** category order) · `PATCH /admin/taxonomies/:id` `{ name?, slug? }` · (category order via `/admin/orderings/projectCategories`) · `DELETE /admin/taxonomies/:id` (409 `IN_USE` while any draft or published content references it). Duplicate slugs per type → 409 `SLUG_TAKEN`. Changes are audited.

### 5.5 Media
| Method & path | Notes |
|---|---|
| `POST /admin/media` | `multipart/form-data` (the only non-JSON body the API accepts; origin check and `X-Requested-With` still apply): `file` (one image, ≤ **10 MB**, JPEG/PNG/WebP/AVIF verified by **magic bytes and the decoder**; **no SVG/GIF/HEIC**; file name and browser MIME type are ignored), `alt`, `decorative` (`true`/`false`), `folder`, `caption?`, `credit?`, `licence?`. The server auto-rotates, scales to ≤ 4096 px on the longest edge and **re-encodes** with sharp (EXIF/GPS and any trailing payload are dropped), stores the file (Cloudinary or local driver) and saves metadata only → `201 { data: media }`. Limits: ≤ 12 000 px per side and ≤ 40 megapixels. Same original file again → `200` with `duplicateOf`. Errors: 413 (size), 415 (type), 422 (fields, e.g. alt text missing unless decorative), 503 (provider down/not configured; nothing is stored) |
| `GET /admin/media?q=&folder=&page=&limit=` | Library listing (`limit` ≤ 100, default 30) |
| `GET /admin/media/:id` | Includes `usage: [{ kind, id, title, state: 'draft'\|'published' }]` |
| `PATCH /admin/media/:id` | `{ alt?, decorative?, caption?, credit?, licence?, folder?, tags? }`. Alt changes apply to all usages immediately. |
| `DELETE /admin/media/:id` | `409 IN_USE` with the usage list (any draft or published content), `503` if the provider cannot delete (record kept), or `204` |

Media responses: `{ id, url, alt, decorative, width, height, dominantColor, variants: [{ width, url }], caption, credit, licence, folder, tags, mimeType, bytes, originalFilename, driver, createdAt, updatedAt }`. There is no "replace file" endpoint: upload a new image and switch the references (D-049).

### 5.6 Leads
| Method & path | Notes |
|---|---|
| `GET /admin/leads?status=&type=&q=&from=&to=&possibleSpam=&page=&limit=` | `q` searches name/company/email (literal match). Items: `{ id, type, status, fullName, companyName, email, budget, possibleSpam, notificationStatus, createdAt }` |
| `GET /admin/leads/:id` | Full lead + notes + notification status (`pending`, `accepted` = the provider confirmed it accepted the e-mail, `failed`, `not_sent`) + spam signals + `expiresAt` |
| `PATCH /admin/leads/:id` | `{ status }` (enum from `DATABASE_SCHEMA.md` §3.11). Moving into/out of `spam` switches the retention period |
| `POST /admin/leads/:id/notes` | `{ text }` → `201` |
| `POST /admin/leads/:id/resend-notification` | Re-queues and retries the e-mail now (409 for spam, an already-accepted notification, or a retry already scheduled/running) |
| `GET /admin/leads/export.csv?…filters` **⇑** | CSV (UTF-8 with BOM, all cells quoted, formula-injection-safe: cells starting with `= + - @`, tab or CR are prefixed with `'`), max 10 000 rows; `Content-Disposition: attachment`; audited with the row count only |
| `DELETE /admin/leads/:id` **⇑** | Erasure; requires `{ "confirm": "DELETE" }`; audited without PII |
| (scheduled) | A daily purge deletes leads past `expiresAt` (D-032); one audit entry with counts. Manual run: `npm run retention:run` (dry run unless `--apply`) |

### 5.7 Redirects
`GET /admin/redirects?q=&source=&page=&limit=` · `POST /admin/redirects` `{ fromPath, toPath, statusCode?: 301|302, enabled? }` · `PATCH /admin/redirects/:id` (same fields, optional) · `DELETE /admin/redirects/:id`. `fromPath` is normalised (lower case, no trailing slash). Validation rejects reserved paths (`/`, `/api`, `/admin`, `/uploads`, `/assets`, `sitemap.xml`, `robots.txt`), self-loops, chains (the target is itself redirected, or another redirect points here), duplicate `fromPath` (409), paths owned by content (409; content always wins, D-038) and targets other than a site path or an `https://` URL. Slug changes create `source: 'slug-change'` redirects automatically and re-point older ones, so chains never form. Changes are audited (fail-closed).

### 5.8 Administrators (all `super_admin`; D-004)
| Method & path | Notes |
|---|---|
| ✅ `GET /admin/administrators` | `[{ id, name, email, role, status, mustChangePassword, twoFactorEnabled, securityAlert, lastLoginAt, createdAt }]` |
| ✅ `POST /admin/administrators` **⇑** | `{ name, email, temporaryPassword? }`: if `temporaryPassword` is omitted the server generates one and returns it **once** (`201 { data: { admin, temporaryPassword } }`) → `mustChangePassword: true`, must enrol 2FA at first sign-in. Role is always `super_admin` and isn't accepted from input. |
| ✅ `PATCH /admin/administrators/:id` **⇑** | `{ name, status }`. Can't disable self or the last active admin. |
| ✅ `DELETE /admin/administrators/:id` **⇑** | Can't delete self or the last active admin |
| ✅ `POST /admin/administrators/:id/reset-password` **⇑** | `{ temporaryPassword? }` (generated and returned once if omitted) → revokes that admin's sessions; **2FA unchanged**; audited + notified (D-039) |
| ✅ `POST /admin/administrators/:id/reset-2fa` **⇑** | Clears the target's 2FA, revokes its sessions, forces re-enrolment; **password unchanged**; not allowed on yourself; audited + notified (D-039) |
| ✅ `POST /admin/administrators/:id/revoke-sessions` | Ends all sessions of that admin (audited) |

### 5.9 Dashboard & audit
- `GET /admin/dashboard` → `{ counts: { page|service|project|testimonial|job: { published, total }, media: { total } }, leads: { new, last30Days, possibleSpam, failedNotifications }, unpublishedChanges: [{ kind, id, title, status, updatedAt }], placeholders: [{ kind, id, title, count }], brokenReferences: [{ kind, id, title, missing }], recentContentChanges: [ … ], recentActivity: [{ at, actorName, action, outcome, entityType, entityId, summary }] }`. Contains no lead names, contact details or messages and no administrator e-mail addresses.
- ✅ `GET /admin/audit-logs?actor=&action=&entityType=&from=&to=&page=&limit=` (read-only; newest first; each entry `{ id, at, actor, actorEmail, action, outcome, entityType, entityId, summary, meta, ipHash, requestId }`).

---

## 6. Endpoint security matrix

| Prefix | Session | Role | Origin check | Rate limit | Returns drafts |
|---|:-:|:-:|:-:|---|:-:|
| `/api/v1/health` | — | — | — | public | — |
| `/api/v1/public/*` GET | — | — | — | 120/min/IP | **Never** |
| `/api/v1/public/leads` POST | — | — | ✓ | 5/h + 20/day per IP | — |
| `/api/v1/auth/login` | — | — | ✓ | 5/15 min/IP+email | — |
| `/api/v1/auth/*` (other) | ✓ | `super_admin` | ✓ (non-GET) | admin | — |
| `/api/v1/admin/*` | ✓ | `super_admin` | ✓ (non-GET) | admin / uploads | ✓ |
| `/sitemap.xml`, `/robots.txt`, HTML pages | — | — | — | — | **Never** |

---

## Appendix A. Admin route index
Every route of the admin route table (`server/src/routes/admin/`), in mounting order. All require an `active` `super_admin` session; ⇑ = step-up. `server/test/contract.test.js` fails when a route is missing here.

| Method & path | Step-up | Section |
|---|---|---|
| `GET /admin/pages` |  | §5.1 |
| `POST /admin/pages` |  | §5.1 |
| `GET /admin/pages/:id` |  | §5.1 |
| `PUT /admin/pages/:id/draft` |  | §5.1 |
| `POST /admin/pages/:id/publish` |  | §5.1 |
| `POST /admin/pages/:id/unpublish` |  | §5.1 |
| `POST /admin/pages/:id/discard-draft` |  | §5.1 |
| `GET /admin/pages/:id/revisions` |  | §5.1 |
| `POST /admin/pages/:id/revisions/:rev/restore` |  | §5.1 |
| `DELETE /admin/pages/:id` |  | §5.1 |
| `GET /admin/services` |  | §5.1 |
| `POST /admin/services` |  | §5.1 |
| `GET /admin/services/:id` |  | §5.1 |
| `PUT /admin/services/:id/draft` |  | §5.1 |
| `POST /admin/services/:id/publish` |  | §5.1 |
| `POST /admin/services/:id/unpublish` |  | §5.1 |
| `POST /admin/services/:id/discard-draft` |  | §5.1 |
| `GET /admin/services/:id/revisions` |  | §5.1 |
| `POST /admin/services/:id/revisions/:rev/restore` |  | §5.1 |
| `DELETE /admin/services/:id` |  | §5.1 |
| `GET /admin/projects` |  | §5.1 |
| `POST /admin/projects` |  | §5.1 |
| `GET /admin/projects/:id` |  | §5.1 |
| `PUT /admin/projects/:id/draft` |  | §5.1 |
| `POST /admin/projects/:id/publish` |  | §5.1 |
| `POST /admin/projects/:id/unpublish` |  | §5.1 |
| `POST /admin/projects/:id/discard-draft` |  | §5.1 |
| `GET /admin/projects/:id/revisions` |  | §5.1 |
| `POST /admin/projects/:id/revisions/:rev/restore` |  | §5.1 |
| `DELETE /admin/projects/:id` |  | §5.1 |
| `GET /admin/testimonials` |  | §5.1 |
| `POST /admin/testimonials` |  | §5.1 |
| `GET /admin/testimonials/:id` |  | §5.1 |
| `PUT /admin/testimonials/:id/draft` |  | §5.1 |
| `POST /admin/testimonials/:id/publish` |  | §5.1 |
| `POST /admin/testimonials/:id/unpublish` |  | §5.1 |
| `POST /admin/testimonials/:id/discard-draft` |  | §5.1 |
| `GET /admin/testimonials/:id/revisions` |  | §5.1 |
| `POST /admin/testimonials/:id/revisions/:rev/restore` |  | §5.1 |
| `DELETE /admin/testimonials/:id` |  | §5.1 |
| `GET /admin/jobs` |  | §5.1 |
| `POST /admin/jobs` |  | §5.1 |
| `GET /admin/jobs/:id` |  | §5.1 |
| `PUT /admin/jobs/:id/draft` |  | §5.1 |
| `POST /admin/jobs/:id/publish` |  | §5.1 |
| `POST /admin/jobs/:id/unpublish` |  | §5.1 |
| `POST /admin/jobs/:id/discard-draft` |  | §5.1 |
| `GET /admin/jobs/:id/revisions` |  | §5.1 |
| `POST /admin/jobs/:id/revisions/:rev/restore` |  | §5.1 |
| `DELETE /admin/jobs/:id` |  | §5.1 |
| `PUT /admin/projects/:id/permission` |  | §5.1 |
| `PUT /admin/testimonials/:id/consent` |  | §5.1 |
| `GET /admin/settings` |  | §5.3 |
| `GET /admin/settings/:key` |  | §5.3 |
| `PUT /admin/settings/:key/draft` |  | §5.3 |
| `POST /admin/settings/:key/publish` | ⇑ (privacy, leadForm) | §5.3 |
| `POST /admin/settings/:key/discard-draft` |  | §5.3 |
| `GET /admin/settings/:key/revisions` |  | §5.3 |
| `POST /admin/settings/:key/revisions/:rev/restore` |  | §5.3 |
| `GET /admin/orderings/:key` |  | §5.2a |
| `PUT /admin/orderings/:key/draft` |  | §5.2a |
| `POST /admin/orderings/:key/publish` |  | §5.2a |
| `POST /admin/orderings/:key/discard-draft` |  | §5.2a |
| `GET /admin/preview/site` |  | §5.2 |
| `GET /admin/preview/pages/:id` |  | §5.2 |
| `GET /admin/preview/services/:id` |  | §5.2 |
| `GET /admin/preview/projects/:id` |  | §5.2 |
| `GET /admin/preview/jobs/:id` |  | §5.2 |
| `GET /admin/taxonomies` |  | §5.4 |
| `POST /admin/taxonomies` |  | §5.4 |
| `PATCH /admin/taxonomies/:id` |  | §5.4 |
| `DELETE /admin/taxonomies/:id` |  | §5.4 |
| `GET /admin/redirects` |  | §5.7 |
| `POST /admin/redirects` |  | §5.7 |
| `PATCH /admin/redirects/:id` |  | §5.7 |
| `DELETE /admin/redirects/:id` |  | §5.7 |
| `POST /admin/media` |  | §5.5 |
| `GET /admin/media` |  | §5.5 |
| `GET /admin/media/:id` |  | §5.5 |
| `PATCH /admin/media/:id` |  | §5.5 |
| `DELETE /admin/media/:id` |  | §5.5 |
| `GET /admin/leads` |  | §5.6 |
| `GET /admin/leads/export.csv` | ⇑ | §5.6 |
| `GET /admin/leads/:id` |  | §5.6 |
| `PATCH /admin/leads/:id` |  | §5.6 |
| `POST /admin/leads/:id/notes` |  | §5.6 |
| `POST /admin/leads/:id/resend-notification` |  | §5.6 |
| `DELETE /admin/leads/:id` | ⇑ | §5.6 |
| `GET /admin/dashboard` |  | §5.9 |
| `GET /admin/administrators` |  | §5.8 |
| `POST /admin/administrators` | ⇑ | §5.8 |
| `PATCH /admin/administrators/:id` | ⇑ | §5.8 |
| `DELETE /admin/administrators/:id` | ⇑ | §5.8 |
| `POST /admin/administrators/:id/reset-password` | ⇑ | §5.8 |
| `POST /admin/administrators/:id/reset-2fa` | ⇑ | §5.8 |
| `POST /admin/administrators/:id/revoke-sessions` |  | §5.8 |
| `GET /admin/audit-logs` |  | §5.9 |
