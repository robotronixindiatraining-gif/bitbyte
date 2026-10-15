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
