# Progress

Status of every stage. Updated at the end of each working session and each stage. Detailed actions are in `STAGE_LOG.md`.

| Stage | Name | Status | Updated |
|---|---|---|---|
| 00 | Discovery & master planning | ✅ Completed: approved with amendments | 2026-10-15 |
| 01 | Content extraction & asset inventory | 🟡 **In progress, blocked**: extraction done to the limit of the available access; acceptance criteria not met | 2026-10-15 |
| 02 | Architecture & design specification | ⏸ Not started (waits on Stage 01 approval) | — |
| 03 | Project foundation | ⏸ Not started | — |
| 04 | Backend core & auth | ⏸ Not started | — |
| 05 | CMS APIs & media | ⏸ Not started | — |
| 06 | Design system implementation & public shell | ⏸ Not started | — |
| 07 | Public website | ⏸ Not started | — |
| 08 | Admin dashboard | ⏸ Not started | — |
| 09 | Content entry, QA & hardening | ⏸ Not started | — |
| 10 | Deployment & launch | ⏸ Not started | — |

## Confirmed project decisions (as of Stage 01 approval)
- MERN stack, JavaScript only. **TypeScript is prohibited.** Tailwind CSS.
- A new website; the existing site supplies business content only, not design.
- **No legacy application or database** to migrate.
- `training.bitbyteindia.com` is **separate** and is not merged.
- **Exactly one administrative role: `super_admin`.** Public visitors are unauthenticated. No public registration, login or user accounts. All privileged actions are authorised on the backend.
- Unverifiable facts are recorded as `[CONFIRM …]` placeholders and never presented as verified.

**Superseded parts of `STAGE_00_DISCOVERY_REPORT.md`:** §1.3 and §5.4 (legacy recovery/migration), §6.1 (three-role matrix), the `trainingPrograms` collection, and Q2/Q3/Q13 (now answered). These will be removed from the plan documents in Stage 02.

## Stage 01: acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Every accessible page captured with its content, not just titles | ⚠️ Partial. 7 URLs found in the index; partial text for 6. **No page loaded directly** (environment network policy). |
| 2 | Every content item labelled by evidence quality | ✅ Done. All items `indexed_unverified` or `placeholder`/`conflict`. |
| 3 | Asset inventory with source, retrieval status and suggested filenames | ⚠️ Partial. Structure complete; **0 assets retrieved, 0 asset URLs found** |
| 4 | Route map with original URLs, proposed routes and redirects | ⚠️ Partial. 4 redirect rules confirmed from the index; 5 legacy URLs unknown |
| 5 | Gaps, conflicts and inaccessible items documented | ✅ Done (`CONTENT_GAPS.md`, 27 items) |
| 6 | Unavailable pages distinguished from confirmed non-existent pages | ✅ Done. None confirmed absent. |
| 7 | No invented content | ✅ Done |
| 8 | Owner has reviewed the inventory and answered the blocking confirmations | ❌ Pending |
| 9 | Logo obtained so the brand palette can be derived in Stage 02 | ❌ Pending |

**Stage 01 can be marked complete when:** criteria 1, 3 and 4 are upgraded through one access option (`CONTENT_GAPS.md` §A), the logo has arrived (9), and the owner has resolved or explicitly deferred the conflicts in `CONTENT_GAPS.md` §B (8).

## Dependencies
No packages installed, removed or upgraded in Stages 00–01. Version research only (`npm view`).
