# Deployment

| | |
|---|---|
| **Status** | **Proposed hosting setup** (D-021). **Nothing is provisioned.** No production resources, accounts, DNS records or secrets have been created. **Cloudinary, Resend and Turnstile production configuration is pending**: the code is implemented and tested against mocks only (§4b). The full release procedure is completed in Stage 10. |
| **Related** | `ARCHITECTURE.md` §8 and §10 (configuration, operations), `DECISIONS.md` D-018–D-022, D-028, D-032, D-041 |

## 1. Target topology

```
Visitor / admin ──HTTPS──▶ www.bitbyteindia.com ──▶ one Node 22 service (Express)
                                                      ├─ React site + admin (static build)
                                                      ├─ /api/v1 (public, auth, admin)
                                                      └─ sitemap.xml, robots.txt
                                     ┌───────────────────────┼───────────────────────┐
                                     ▼                       ▼                       ▼
                         MongoDB Atlas (managed)    Cloudinary (media CDN)    Resend (e-mail)
                                                     Cloudflare Turnstile (siteverify)
```

- **One public domain.** The site, admin and API share an origin (D-006). There is no separate API host and no CORS.
- **Stateless app.** Sessions and content live in MongoDB; media lives in Cloudinary. The app server needs **no persistent disk**, so it can be redeployed or replaced freely.
- **One instance.** Rate limits, the public read cache (D-054) and the scheduled jobs (retention purge, notification retries; D-055) run in process. Run a single instance; if more are ever needed, set `JOBS_ENABLED=false` on all but one and move rate limits to a shared store first (D-011).

## 2. Hosting options (owner selects before Stage 10)

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A: Managed Node platform (recommended)** | A managed web service (e.g. Render, Railway, Fly.io) running `npm start`, in an Asian region | TLS, deploys from GitHub, health checks, rolling restarts and logs built in; least maintenance | Monthly cost per instance; region choice limited (often Singapore for South Asia) |
| B: VPS | A small Linux VM (e.g. AWS Lightsail Mumbai, DigitalOcean Bangalore) with Nginx + PM2/systemd | Low cost, Indian region | You patch the OS, configure TLS renewal, firewall and log rotation |

**Database:** MongoDB Atlas, in the **same cloud region as the app** (e.g. Singapore with option A, Mumbai with option B) to keep query latency low. Use a tier with **automated backups** (the free M0 tier is not suitable for production). Confirm the tier's backup features and limits when choosing.

Selection criteria: budget, who maintains it, region latency for Indian visitors, automatic TLS, health-check support, and log retention.

## 3. Pre-launch domain verification (D-028), required before any DNS or redirect change
1. Record the **current** DNS zone for `bitbyteindia.com`: A/AAAA/CNAME for the apex and `www`, **MX, SPF, DKIM and DMARC** (company e-mail must not break), and any `training` subdomain records (D-003: leave untouched).
2. Check the current TLS certificates and which host (apex or `www`) currently serves and redirects.
3. Check Google Search Console (if verified) for the preferred/indexed host.
4. Only then: point `www` at the new service, set `CANONICAL_HOST=www.bitbyteindia.com`, and redirect apex → `www` at the DNS/host level.
5. Add Resend's domain records (SPF/DKIM) **merged** with the existing SPF, not replacing it.

## 4. Environment variables (names only; values live in the host's secret store)
`NODE_ENV=production`, `PORT`, `PUBLIC_SITE_URL`, `MONGODB_URI`, `TRUST_PROXY_HOPS`, `LOG_LEVEL`, `CLIENT_DIST_DIR`, then by stage: `ALLOWED_ORIGINS`, `SESSION_*`, `TOTP_ENCRYPTION_KEY`, `RECOVERY_CODE_PEPPER`, `IP_HASH_SALT` (04); `MEDIA_DRIVER=cloudinary`, `CLOUDINARY_URL`, `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM`, `LEAD_NOTIFICATION_EMAILS` (optional fallback), `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, `JOBS_ENABLED` (default on), `ROBOTS_ALLOW_INDEXING` (**false until launch**) (05); `CANONICAL_HOST` (10, after verification); `ERROR_TRACKING_DSN` (optional).
**Never** commit `.env` files. `server/.env.example` contains placeholders only.

What happens while a Stage 05 service is not configured (the server still starts):
| Missing | Effect |
|---|---|
| `MEDIA_DRIVER=cloudinary` + `CLOUDINARY_URL` | Media uploads and deletions answer 503; existing media still display. (`MEDIA_DRIVER=local` is refused in production.) |
| `MAIL_DRIVER=resend` + `RESEND_API_KEY` + `MAIL_FROM` | No e-mail is sent (`log` driver): lead notices show "Not sent"; security notices are only logged. A start-up warning is logged. |
| `TURNSTILE_SECRET_KEY` | The contact form answers 503 (no unprotected submissions). A start-up warning is logged. |
| `ROBOTS_ALLOW_INDEXING=true` | Search engines are asked not to index anything (intended before launch). |

## 4b. Activating the third-party services (pending: credentials not yet supplied or tested)
Use company-owned accounts. Put every value only in the host's secret store. After each step, check the effect described, because so far **only mocked providers have been tested** (`PROGRESS.md`).
1. **Cloudinary (D-018):** create the product environment; copy the **API environment variable** (`cloudinary://<key>:<secret>@<cloud>`) into `CLOUDINARY_URL`; set `MEDIA_DRIVER=cloudinary`. Uploads go to `bitbyte/production/<uuid>` (signed, server-side). Verify: upload a test image in the admin, open its URL and a variant URL, delete it and confirm it is gone from the Cloudinary console. Re-check the plan's storage/transformation limits (D-018).
2. **Resend (D-019):** verify the sending domain (SPF/DKIM records **merged** with the existing SPF, §3), create an API key restricted to sending, set `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM` (an address on the verified domain). Publish Settings → Contact form with the notification recipients (or set `LEAD_NOTIFICATION_EMAILS`). Verify: submit a test enquiry and confirm the lead shows **Accepted by the mail provider** and the notice arrives; trigger a 2FA-reset notice between two test admins.
3. **Cloudflare Turnstile (D-020):** create a widget for the production hostname(s); put the **site key** in Settings → Integrations (public) and the **secret key** in `TURNSTILE_SECRET_KEY`; set `TURNSTILE_ALLOWED_HOSTNAMES` (e.g. `www.bitbyteindia.com`). Verify: a real browser submission is accepted with `turnstile: pass`; a replayed token is refused (`CAPTCHA_FAILED`). The public form UI that renders the widget arrives in Stage 07.
4. Restart the service after changing secrets; confirm the start-up warnings for mail/Turnstile are gone.

## 4a. First production bootstrap (Stage 04 tooling)
1. Generate the secrets once on a trusted machine: `npm run secrets:generate`. Store them **only** in the host's secret store. Never put them in Git, chat or tickets. Back them up in the company password manager: losing `TOTP_ENCRYPTION_KEY` forces every admin to re-enrol 2FA.
2. Deploy; the server creates missing indexes on start-up.
3. From a shell on the host (same environment): `npm run seed -- --allow-production`, then `npm run admin:create -- --email … --name "…" --allow-production`. The temporary password is printed once; hand it over in person or by phone.
4. The admin signs in, enrols 2FA, stores the recovery codes offline and changes the password. Create a **second** super admin the same way, so account recovery never depends on server access.
5. Both commands are safe to re-run and are recorded in the audit log as `system:cli`.

## 5. Build, release & rollback
- CI (`.github/workflows/ci.yml`) runs `npm run check`: no-TypeScript guard, lint, format check, tests, client build and smoke test.
- **Release:** the host builds with `npm ci && npm run build` and starts with `npm start`. Health checks: liveness `GET /api/v1/health`; readiness `GET /api/v1/health/ready` (D-041).
- **Rollback:** redeploy the previous commit. Database changes are additive and migrations idempotent, so older builds keep working.

## 6. Backups & data retention
- **MongoDB:** daily automated snapshots, with **retention ≤ 35 days**. Deleted personal data must age out of backups (D-032). Restore is tested before launch and quarterly afterwards.
- **Lead retention purge (D-055):** runs inside the server one minute after start and every 24 h; deletes only leads past `expiresAt`, in batches, and writes one audit entry with counts. If a run fails (e.g. database unavailable) it is logged and the next run completes the work; nothing is half-deleted per lead. To check what is due: `npm run retention:run` (dry run); to purge immediately: `npm run retention:run -- --apply --allow-production`. **Never run `--apply` against a database you have not confirmed is the intended one.**
- **Media:** Cloudinary keeps the normalised originals. A scripted export of media metadata + originals is part of Stage 10.
- **Logs:** host log retention ≤ 30 days; logs contain no lead message bodies or contact details (redaction).

## 7. Monitoring
- Uptime check on liveness and readiness.
- Alerts: repeated 5xx responses, readiness failures, failed lead notifications (dashboard count `leads.failedNotifications`), "orphaned media asset" and "retention purge stopped early" log lines.
- Optional error tracking (D-022) via `ERROR_TRACKING_DSN`; disabled by default.

## 8. Launch checklist (completed in Stage 10)
- [ ] Hosting option chosen and accounts owned by the company
- [ ] Atlas cluster with backups, least-privilege user, IP/network access restricted
- [ ] Cloudinary account (company-owned), plan limits re-checked, upload/delete verified (D-018, §4b)
- [ ] Resend domain verified; test notification accepted and received (D-019, §4b)
- [ ] Turnstile site/secret keys for the production hostname; real submission verified (D-020, §4b)
- [ ] Contact form and privacy settings published (form is off until then)
- [ ] All secrets set in the host secret store; `.env.example` unchanged
- [ ] Domain verification (§3) done; canonical host enabled
- [ ] `ROBOTS_ALLOW_INDEXING=true` set at go-live (not before)
- [ ] No `[CONFIRM …]` placeholders on published content
- [ ] Backup restore tested
- [ ] Search Console: sitemap submitted
