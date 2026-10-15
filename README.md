# bitbyte

A complete rebuild of the **BitByte Software Technology** company website (`bitbyteindia.com`): a premium, responsive public site plus a secure admin dashboard where a super administrator manages all business content without code changes.

> **Status:** planning and specification. **No application code exists yet.** Stage 02 (architecture & design specification) is awaiting approval; implementation starts in Stage 03. See [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Stack (decided)
MongoDB · Express 5 · React 19 (Vite) · Node.js 22 LTS · Tailwind CSS v4. **JavaScript only — no TypeScript anywhere.**

## Key decisions
- One deployable Node service serving the public site, the admin UI and a versioned REST API (`/api/v1`) from a single origin.
- Hybrid CMS: dedicated collections (services, projects, testimonials, jobs, leads, media, settings) + pages built from an approved set of section types, with draft → preview → publish and revision history.
- Exactly one administrative role, `super_admin`. Visitors are anonymous; there is no public registration or login.
- Unverified business facts are stored as `[CONFIRM …]` placeholders, which **cannot be published**.
- `training.bitbyteindia.com` is a separate property and is not part of this project.

## Documentation
| Document | Purpose |
|---|---|
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | Scope, stages, acceptance criteria, decision gates |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Current status of every stage |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System structure, security boundaries, configuration, deployment |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | MongoDB collections, relationships, indexes, section types |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | REST API contract (public, auth, admin) |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Visual design, tokens (provisional palette), components, motion, accessibility |
| [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) | Super-admin workflows |
| [`docs/ROUTE_MAP.md`](docs/ROUTE_MAP.md) | Public/admin routes and legacy redirects |
| [`docs/CONTENT_INVENTORY.md`](docs/CONTENT_INVENTORY.md) | Content extracted from the current site (unverified) |
| [`docs/ASSET_INVENTORY.md`](docs/ASSET_INVENTORY.md) | Logos and media (none retrieved yet) |
| [`docs/CONTENT_GAPS.md`](docs/CONTENT_GAPS.md) | Missing, conflicting and unverified information to confirm |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log |
| [`docs/STAGE_LOG.md`](docs/STAGE_LOG.md) | Per-stage actions, methods and validation |
| [`docs/STAGE_00_DISCOVERY_REPORT.md`](docs/STAGE_00_DISCOVERY_REPORT.md) | Original discovery report (historical; superseded items listed in `DECISIONS.md`) |

## Getting started
Setup instructions will be added in Stage 03 (project foundation), once the workspaces exist.
