# Asset Inventory — bitbyteindia.com

| | |
|---|---|
| **Retrieval date** | 2026-10-15 |
| **Assets retrieved** | **0.** No file from bitbyteindia.com could be downloaded (`STAGE_LOG.md` §2). |
| **Asset URLs discovered** | **0.** Search indexes returned no image, logo, favicon or font URLs for this domain. |
| **Brand palette status** | **Not chosen.** It will be derived from the actual logo once that file is supplied. No logo has been invented or substituted. |

Each row below is an asset that is **expected** from the indexed page structure, not one that was observed. Original URL, filename, type and dimensions stay `[UNKNOWN]` until retrieved. "Suggested new filename" is a proposal for the new media library.

## 1. Brand assets

| ID | Asset | Original URL / filename / type | Dimensions | Where used | Retrieved | Suggested new filename | Purpose / alt text | Needs confirmation |
|---|---|---|---|---|:-:|---|---|---|
| A-01 | Primary logo (header) | `[UNKNOWN]` | `[UNKNOWN]` | Site header, all pages | ✗ | `bitbyte-logo-primary.svg` (+ `.png` fallback) | Alt: "BitByte Software Technology" `[CONFIRM EXACT NAME]` | **Yes:** need the master vector (SVG/AI/EPS/PDF) from the owner |
| A-02 | Logo variant for dark backgrounds | `[UNKNOWN]`; may not exist | `[UNKNOWN]` | Footer / dark sections | ✗ | `bitbyte-logo-inverse.svg` | Same as A-01 | Yes: confirm whether one exists or approve creating it from A-01 |
| A-03 | Logo mark / icon only | `[UNKNOWN]` | `[UNKNOWN]` | Favicon, social avatar | ✗ | `bitbyte-mark.svg` | Decorative when shown next to the wordmark | Yes |
| A-04 | Favicon(s) | `[UNKNOWN]` (`/favicon.ico` not fetchable) | `[UNKNOWN]` | Browser tab | ✗ | `favicon.ico`, `icon.svg`, `apple-touch-icon.png` (180×180) | — | Yes: will be regenerated from A-03 |
| A-05 | Open Graph / social share image | `[UNKNOWN]`; none captured | — | Link previews | ✗ | `og-default.png` (1200×630) | Text alt in metadata | New asset, created in Stage 02 from approved brand |
| A-06 | Brand fonts | `[UNKNOWN]` | — | Site typography | ✗ | n/a | — | The new design uses self-hosted open-licence fonts. Only matters if the logo uses a licensed typeface. |
| A-07 | Brand guidelines / colour codes | `[UNKNOWN]` | — | — | ✗ | `docs/brand/` (reference only) | — | Yes: ask the owner if any exist |

## 2. Page imagery (expected, unobserved)

| ID | Asset | Page / section | Retrieved | Suggested new filename | Purpose | Needs confirmation |
|---|---|---|:-:|---|---|---|
| A-10 | Homepage hero / banner image(s) | `/` hero | ✗ | `home-hero-*.webp` | Unknown | Yes, and probably replaced in the redesign |
| A-11 | Service icons or illustrations (×5) | Service menu / service pages | ✗ | `service-{slug}-icon.svg` | Visual for each service | Yes; likely replaced by a consistent icon set |
| A-12 | IoT page imagery | `/internet-of-things` | ✗ | `service-internet-of-things-hero.webp` | Unknown | Yes |
| A-13 | CMS page imagery | `/cms-development` | ✗ | `service-cms-development-hero.webp` | Unknown | Yes |
| A-14 | Digital marketing page imagery | `/digital-marketing` | ✗ | `service-digital-marketing-hero.webp` | Unknown | Yes |
| A-15 | Careers page imagery | `/careers/` | ✗ | `careers-hero.webp` | Unknown | Yes |
| A-16 | Contact page imagery / map | `/contact` | ✗ | `contact-office.webp` | Unknown | Yes |
| A-17 | Office / team photographs | Unknown | ✗ | `office-*.webp`, `team-*.webp` | Authenticity | Yes: need photos and permission from the people shown |

## 3. Portfolio imagery (expected, one or more per project)

All are unretrieved. Each needs **client permission** before reuse (`CONTENT_GAPS.md` CG-07, CG-08).

| ID | Project | Suggested new filenames | Alt-text basis | Needs confirmation |
|---|---|---|---|---|
| A-20 | Apna Gaadi | `project-apna-gaadi-cover.webp`, `-gallery-01.webp` … | "Screenshot of the Apna Gaadi website" `[CONFIRM]` | Images + consent |
| A-21 | Manviya | `project-manviya-*` | `[CONFIRM]` | Images + consent |
| A-22 | Kissan Live | `project-kissan-live-*` | `[CONFIRM]` | Images + consent |
| A-23 | Robotronix | `project-robotronix-*` | `[CONFIRM]` | Images + consent/relationship |
| A-24 | Fortitude | `project-fortitude-*` | `[CONFIRM]` | Images + consent |
| A-25 | Electronics Pro | `project-electronics-pro-*` | `[CONFIRM]` | Images + consent |
| A-26 | Xpression | `project-xpression-*` | `[CONFIRM]` | Images + consent |
| A-27 | Child Security | `project-child-security-*` | `[CONFIRM]` | Images + consent |
| A-28 | Client logos (if shown) | `client-{slug}-logo.svg` | Client name | Trademark permission from each client |

## 4. Downloads and documents
| ID | Asset | Status |
|---|---|---|
| A-30 | Brochure / company profile PDF | None found; `[CONFIRM WHETHER ONE EXISTS]` |
| A-31 | Certificates, awards, registrations | None found. Do not display any without documentary proof. |

## 5. Retrieval failures (summary)

| Target | Method | Result |
|---|---|---|
| `https://www.bitbyteindia.com/` (and every asset under it) | curl via environment proxy | `CONNECT tunnel failed, response 403` |
| `https://bitbyteindia.com/`, `http://…` variants | curl | Same 403 / no connection |
| Same URLs | Headless Chromium (Playwright) | `net::ERR_TUNNEL_CONNECTION_FAILED` |
| Same URLs | WebFetch tool | `getaddrinfo ENOTFOUND` |
| Image search for the logo | WebSearch | No result for this company |

Full details are in `STAGE_LOG.md`.

## 6. Handling rules for when assets arrive
1. Store originals unchanged under `legacy/assets/` (not served) with a `SOURCES.md` noting origin, date and licence.
2. Record filename, type, dimensions and SHA-256 here, then set **Retrieved ✓**.
3. Import into the CMS media library only after the owner confirms rights to use them.
4. Derive the brand palette from the vector logo (A-01) and record the extracted hex values and contrast checks in `DESIGN_SYSTEM.md` (Stage 02).
