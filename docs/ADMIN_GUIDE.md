# Admin Guide: Super-Admin Workflows

| | |
|---|---|
| **Status** | Stage 02 **workflow specification**. Becomes the step-by-step user guide, with screenshots, in Stage 08. |
| **Audience** | The `super_admin`, the only administrative role (D-004). |
| **Goal** | All meaningful business content is managed without touching source code. Developers are only needed for **new section types, new page templates or design-system changes**. |

---

## 1. Access

| Topic | Behaviour |
|---|---|
| Sign-in URL | `/admin/login` (the only login on the site; there are no visitor accounts) |
| First account | Created on the server with `npm run admin:create` (§1.1). It prints a one-time temporary password; at first sign-in you set up two-factor, then change the password |
| More accounts | Any super admin can add another named super admin (Administrators screen), so each person has their own account and audit trail. All accounts have identical rights (D-004). |
| Session | Signs out after **2 h idle** or **12 h** total. "Sign out other devices" is available under Account. |
| Lockout | Repeated failed sign-ins lock the account temporarily; the message is always generic |
| Two-factor (mandatory) | Every account uses an authenticator app (TOTP). At first sign-in you scan a QR code, confirm a code, and receive **10 recovery codes shown once**: store them offline. Until enrolment is complete, the account can only enrol or sign out. After enrolment, an account with a temporary password can only change it (D-026, D-039). |
| Sign-in | E-mail + password, then a 6-digit code (or one recovery code). A password alone never opens the dashboard. |
| Sensitive actions | Changing your password (asks for your current password and a code directly), regenerating recovery codes, managing administrators, exporting or erasing leads and changing retention ask you to **re-confirm password + code** (valid 5 minutes) |
| Lost phone | Sign in with a recovery code, then re-enrol under Account → Two-factor |
| Lost phone **and** recovery codes | Another super admin uses **Reset two-factor** on your account (after re-confirming their own password + code). Your sessions end, your password stays the same, and you re-enrol at next sign-in. If no other admin can help, a developer runs `npm run admin:reset-2fa` on the server. |
| Forgotten password | Another super admin sets a temporary password (your 2FA stays in place), or a developer runs `npm run admin:reset-password`. There are no e-mail reset links (D-027). |
| Notifications | Every password or 2FA reset and every recovery-code use is e-mailed to the affected admin and all other admins, and shown as a dashboard alert for 7 days. (Until the Resend driver arrives in Stage 05, e-mails are only recorded in the server log.) |

### 1.1 Server commands (implemented in Stage 04)
Run on the server, from the repository root. They need the same environment as the server (`server/.env` locally, the host's secret store in production). **In production every command refuses to run unless `--allow-production` is added**, so an account cannot be created by accident. No command accepts a password: temporary passwords are generated, shown once, and must be changed at first sign-in.

| Task | Command | Effect |
|---|---|---|
| Generate the security secrets (once per environment) | `npm run secrets:generate` | Prints `TOTP_ENCRYPTION_KEY`, `RECOVERY_CODE_PEPPER` and `IP_HASH_SALT`. Paste them into `server/.env` (local) or the host's secret store. Nothing is written to disk. |
| Create the first (or another) super admin | `npm run admin:create -- --email you@example.com --name "Your Name"` | New account with a one-time temporary password. Safe to re-run: an existing e-mail is never modified. |
| List administrators | `npm run admin:list` | E-mail, name, status, 2FA state, last sign-in (no secrets) |
| Forgotten password (no other admin available) | `npm run admin:reset-password -- --email you@example.com` | New temporary password; all sessions end; **2FA unchanged** |
| Lost authenticator **and** recovery codes (no other admin available) | `npm run admin:reset-2fa -- --email you@example.com` | 2FA and recovery codes cleared; all sessions end; **password unchanged**; re-enrol at next sign-in |
| Insert missing placeholder content | `npm run seed` | Inserts only what is missing; never changes edited content or admin accounts; publishes nothing |

Every command is recorded in the activity log as `system:cli`.

### 1.2 First sign-in (two-factor enrolment)
1. Sign in with your e-mail and the temporary password.
2. Scan the QR code with an authenticator app (or type the manual key), then enter the 6-digit code it shows.
3. Copy the **10 recovery codes** somewhere safe and offline. They are shown only once, and each works only once.
4. Choose a new password (at least 12 characters; very common passwords are refused). You need the current password and a fresh code.
5. You now have full access. Signing in later always needs password + code.

## 2. Dashboard
On sign-in the dashboard shows, from the top:
1. **Needs attention:** new leads (count + latest 5), content with **unpublished changes**, content with **`[CONFIRM …]` placeholders** (each links to the exact field), **broken references** (e.g. a page section pointing at an archived project), and failed lead-notification e-mails.
2. **Site status:** published counts for pages, services, projects, testimonials and open jobs; last publish time.
3. **Recent activity:** the last 10 audit entries.
4. **Quick actions:** New project, New job, Upload media, View site.

## 3. Content lifecycle (applies to settings, pages, services, projects, testimonials, jobs)

```
 New ──▶ DRAFT ──(Save draft)──▶ DRAFT ──(Preview)──▶ preview tab ──(Publish)──▶ PUBLISHED
                                                                                  │
            ┌──────────── edit published item ◀─────────────────────────────────┘
            ▼
   PUBLISHED + "Unpublished changes" ──(Publish)──▶ PUBLISHED (new revision)
            │                          └─(Discard changes)──▶ back to live version
            └──(Unpublish)──▶ ARCHIVED ──(Publish)──▶ PUBLISHED
                                 └──(Delete, if unused)──▶ removed
```

- **Save draft** never changes the live site. Incomplete drafts are allowed.
- **Preview** opens `/admin/preview/…` in a new tab, rendered with the real public design, a yellow "Preview: not published" bar and `noindex`. Preview shows *all* pending drafts together (e.g. a page plus a draft service it references).
- **Publish** runs these checks and lists every problem at once, each linking to its field:
  1. All required fields complete (strict validation).
  2. **No `[CONFIRM …]` placeholders** (D-015).
  3. Every referenced service, project, testimonial or image is published or exists.
  4. Projects: **client permission recorded**. Testimonials: **consent recorded**.
  5. Slug valid and unique. If the slug changed, a 301 redirect from the old URL is **created automatically**.
- **Publish note** (optional) is stored in the revision history.
- **History:** each publish keeps a revision (last 25). **Restore** copies an old version into the draft so it can be reviewed and published again.
- **Edit conflicts:** if the same item was saved elsewhere since you opened it (another admin or another tab), saving shows "This item changed since you opened it" with options to **reload** or **copy my changes**. Nothing is silently overwritten.
- **Unsaved changes:** leaving an editor with unsaved changes asks for confirmation; drafts also autosave locally in the browser every 30 s for recovery.

## 4. Pages & sections
- **Pages list:** the system pages (Home, About, Services, Portfolio, Careers, Contact, Privacy Policy, Terms) plus any custom pages.
- **Page editor:**
  - Page title, slug (locked for system pages) and SEO panel (§9).
  - **Sections list:** each row shows the type icon, its heading, visibility toggle (eye), background variant and handle. Actions: **Move up/down** buttons (keyboard-accessible) and drag-and-drop; **Show/Hide** (hidden sections stay in the draft but aren't rendered); **Duplicate**; **Remove** (with confirmation; not possible for the template's required section).
  - **Add section:** a picker showing **only the section types the page template allows** (`DATABASE_SCHEMA.md` §3.4), each with a thumbnail and description.
  - **Section form:** purpose-built fields per type (e.g. a hero has eyebrow, heading, highlighted phrase, subheading, CTAs, visual). Choices are limited to approved variants: background `light`/`muted`/`dark`, spacing `default`/`compact`, layout options per type. **No free-form HTML, CSS, colours or fonts.**
  - **Guidance:** live character counters, a warning when two dark sections are adjacent, a warning when a `stats` section contains unverified figures, and a reminder that empty testimonial/stat sections are hidden publicly.
- **Custom pages:** "New page" creates a page at `/<slug>` (reserved words blocked) using the `custom` template.
- **Navigation is separate:** pages don't appear in the menu automatically. Add them under **Settings → Navigation** (§8).

## 5. Services
- **List:** drag-and-drop or the up/down buttons set the display order. **Reordering is a draft:** preview shows the new order, and it goes live only when you click **Publish order** (D-037). A banner shows "Order has unpublished changes". Badges show status.
- **Editor fields** (from `DATABASE_SCHEMA.md` §3.5): title, menu label, slug, summary (card text), icon (picker from the curated set), hero image, intro (rich text), **offerings** (repeatable groups: title, optional description, bullet items), industries (tag input), process steps, technologies (tag picker from taxonomies), FAQs, related projects (picker of projects), CTA override, featured toggle, SEO.
- **Seed state:** the five indexed services (Web Development, Internet of Things, Mobile App Development, CMS Solutions, Digital Marketing) start as drafts. Unverified copy is marked `[CONFIRM VERIFIED COPY]`, so they can't be published until the owner checks each text against the source (`CONTENT_INVENTORY.md`).

## 6. Portfolio
- **Projects list:** filter by category and status; drag-and-drop ordering (draft → preview → **Publish order**, D-037); featured toggle visible in the list.
- **Editor:** title, slug, summary, category, technologies, services delivered, client name + "show client name publicly", overview / challenge / solution / outcome (rich text), cover image (required), gallery (reorderable, captions), live URL, year, featured, SEO.
- **Client permission panel:** a checkbox "The client has permitted us to show this work", with a note (who, how, when). The date is recorded automatically. **Required to publish** (CG-07b).
- **Guardrails:** helper text on *Outcome* reads "Only results you can evidence. No invented metrics."
- **Categories & technologies** (Portfolio → Taxonomies): add, rename, and reorder categories (draft → **Publish order**). Delete is blocked while in use, and the screen lists where each one is used. Seeded categories: Web Development, E-Commerce, Internet of Things.

## 7. Testimonials and careers
- **Testimonials:** quote (exact approved wording), author name, role, company, optional photo, optional linked project, featured. A **consent panel** (method + note) is **required to publish**. Third-party directory reviews must not be entered. Until at least one testimonial is published, testimonial sections are hidden on the site automatically.
- **Careers:** job title, department, location, employment type, experience, summary, description, responsibilities, requirements, how to apply, closing date. After the closing date a job disappears from the site and sitemap automatically. It can be **duplicated** to re-post. The careers page shows its empty-state text when no jobs are open. Job order uses drag-and-drop with **Publish order**. **How candidates apply** is set under Settings → Careers (D-031).

## 8. Global settings (Settings area; each tab has its own draft → preview → publish)
| Tab | What it controls |
|---|---|
| **Company** | Company name, legal name, tagline, logo, logo for dark backgrounds, favicon |
| **Contact** | Address lines, phones (label, number, WhatsApp flag), e-mails, office hours, map link/embed |
| **Navigation** | Header menu (links to pages, services, projects or external URLs; one level of children), header CTA. Entity links follow slug changes automatically. |
| **Footer** | Up to four link columns, show-contact toggle, copyright holder, bottom links |
| **Social** | Profiles (LinkedIn, Instagram, Facebook, X, YouTube, GitHub, WhatsApp) |
| **SEO defaults** | Title template, default description, default share image, organisation details for structured data, Search Console verification |
| **Contact form** | Budget options, consent text, success message, **notification recipients** (private, max 5; e-mails sent via Resend, D-019) |
| **Careers** | Application method: *Instructions* (default: free text per job), *E-mail* (careers address), *External link*, or *On-site form* (**unavailable until applicant-data handling is confirmed**, D-031) |
| **Privacy** | Lead retention in days (default **365**, allowed 30–1095; spam 30 days). Changing it needs re-confirmation, and the new value applies to all stored leads (D-032). |
| **Integrations** | Turnstile site key (public; the secret is on the server, D-020). Analytics is **deferred** (D-033). Secret keys are never entered here. |

Seeded values carry `[CONFIRM …]` placeholders from `CONTENT_GAPS.md` (company name, legal entity, phones, e-mails, hours, consent text, budget options…). The dashboard lists every one until it is resolved.

## 9. SEO (on every page, service, project and job)
- **Fields:** SEO title (≤ 70, live counter), meta description (≤ 170), share image, "hide from search engines" (noindex), and an advanced canonical override.
- **Live Google-style result preview** and social-card preview.
- **Defaults:** the entity title + title template; the description falls back to the summary; the share image falls back to the cover/hero, then the site default.
- **Automatic:** sitemap, robots.txt, canonical URLs, JSON-LD (Organization/LocalBusiness from settings, Service, BreadcrumbList, JobPosting, FAQPage).
- **Redirects** (SEO & Redirects screen): list with hit counts; add, edit, disable, delete. Loops, chains and reserved paths are rejected. Slug-change redirects appear here automatically. The four known legacy redirects are pre-loaded.

## 10. Media library
- **Upload:** drag-and-drop or file picker; JPEG/PNG/WebP/AVIF up to 10 MB. **Alt text is required** unless marked decorative. Optional caption, credit and licence (required for stock images).
- Images are automatically resized into responsive versions, converted to modern formats and stripped of location/camera metadata. Duplicates are detected and the existing file is offered instead.
- **Library:** grid and list views, search by alt/filename/tag, folder filter.
- **Detail panel:** preview, dimensions, size, alt/caption editing (alt changes update every page using the image, immediately), and **"Used in"** (every page/entity and whether that usage is draft or live).
- **Replace image:** upload a new file and choose which usages to switch, or switch all.
- **Delete:** only when "Used in" is empty. Otherwise the dialog lists the usages to change first.
- **Not allowed:** SVG, GIF and HEIC uploads (security/performance). Brand SVGs are added by a developer.

## 11. Leads (contact submissions)
- **Inbox:** table of date, name, company, budget, service, status. Filters by status, type and date range; search by name/company/e-mail. New leads are bold.
- **Lead detail:** all submitted fields, source page, UTM data, consent text and time, notification status (with **Resend**), status selector, notes timeline (add note), and quick actions (reply by e-mail, call).
- **Statuses:** New → Contacted → In discussion → Won / Lost; plus **Spam**. Leads flagged by spam checks arrive in a separate "Possible spam" view rather than being silently discarded.
- **Export:** CSV of the current filter (audited).
- **Export:** requires re-confirmation (password + code).
- **Erase:** permanently deletes a lead on the person's request (re-confirmation + type "DELETE"; audited without personal data).
- **Automatic retention:** leads are deleted automatically once older than the retention period (default 365 days; spam 30 days). Each lead shows its scheduled deletion date. Deleted data remains only in backups until they expire (≤ 35 days).
- **E-mail notifications** go to the recipients in Settings → Contact form (D-019).

## 12. Administrators & activity
- **Administrators:** list, add (name, e-mail, temporary password; the new admin must enrol 2FA), disable or enable, delete, **reset password** (2FA unchanged), **reset two-factor** (password unchanged), revoke sessions. Every action here needs re-confirmation and is audited and notified. You can't disable, delete or reset your own account here, or disable the last active admin (D-039).
- **Activity log:** read-only history of sign-ins, publishes, deletions, settings changes, lead exports and erasures, filterable by person, action and date.

## 13. Safety rules built into the admin
| Risk | Protection |
|---|---|
| Publishing unverified facts | `[CONFIRM …]` placeholders block publishing; dashboard checklist |
| Showing client work or quotes without consent | Permission/consent panels required to publish |
| Broken links after renaming | Entity links resolve by ID; automatic 301 on slug change |
| Deleting something in use | Delete blocked with a "used in" list; published items must be unpublished first |
| Overwriting someone else's edits | Revision check → conflict dialog |
| Losing work | Draft autosave in the browser, unsaved-changes prompt, revision history with restore |
| Accidental permanent deletion | Typed confirmation; system pages can't be deleted |
| Invalid input | Field-level validation messages identical to the server's rules (shared schemas), plus a server error summary if something slips through |
| Server errors | A friendly message with a reference code (request ID) to give the developer. The entered data stays in the form. |

## 14. What still needs a developer
- A new **section type** or page template.
- Changes to the design system (colours, typography, component styles), including applying the real logo palette (D-024).
- New integrations (analytics, CAPTCHA provider, e-mail provider), server configuration and secrets.
- Data-model changes (new fields or collections).
