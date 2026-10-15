# Content Inventory — bitbyteindia.com

| | |
|---|---|
| **Stage** | 01: Content extraction |
| **Retrieval date** | 2026-10-15 |
| **Scope** | `bitbyteindia.com` / `www.bitbyteindia.com` only. `training.bitbyteindia.com` is a separate property and is **excluded** by decision. |
| **Access status** | **No page was loaded directly.** Every method of direct access failed (see `STAGE_LOG.md` §2). All content below comes from search-engine indexes. |
| **Companion files** | `ROUTE_MAP.md` (URLs and redirects), `ASSET_INVENTORY.md` (media), `CONTENT_GAPS.md` (missing, conflicting and unverified items) |

## How to read this file

### Evidence labels

| Label | Meaning | Used in this file |
|---|---|---|
| `verified_live` | Directly observed on the current website | **0 items** |
| `verified_source` | From an accessible original source or page file | **0 items** |
| `indexed_unverified` | From search indexes or third-party copies only | All extracted items |
| `placeholder` | Missing; must be supplied | Marked `[CONFIRM …]` |
| `conflict` | Contradictory information; needs a decision | See `CONTENT_GAPS.md` |

### Fidelity sub-labels for `indexed_unverified` text
Search results reached us through a search tool that summarises pages. Only fragments it returned **in quotation marks** are treated as near-original wording.
- **`snippet-quoted`**: text returned inside quotation marks. It is reproduced exactly as returned, original spelling and grammar included (e.g. "Bitbyte evaluate"). It may still be truncated, and has not been checked against the live page.
- **`snippet-paraphrased`**: the search tool's description of page content. **This is not original wording** and must not be used as copy. It only shows that a topic exists on the page.

Nothing in this file has been rewritten, corrected or improved.

---

## G. Site-wide (global) content

These items appear on several indexed pages, which suggests they sit in a shared header, footer or sidebar. They are recorded once here, not repeated per page.

### G1. HTML `<title>`
| Item | Value | Observed on | Label |
|---|---|---|---|
| Page title | `IT Services and IT Business Solution Company` | `/`, `/careers/`, `/cms-development`, `/internet-of-things`, `/digital-marketing`, `/portfolio`, `/contact` | `indexed_unverified` (snippet-quoted, the index's page title) |
| Note | Every indexed page has the same title, so there are no per-page titles today. | | |
| Meta description | `[CONFIRM META DESCRIPTIONS]`: not captured for any page | — | `placeholder` |
| Open Graph / Twitter tags, canonical, favicon | Not captured | — | `placeholder` |

### G2. Primary navigation
| Item | Value | Label |
|---|---|---|
| Services menu (as indexed on `/careers/`) | `SERVICES - WEB DEVELOPMENT - INTERNET OF THINGS - MOBILE APP DEVELOPMENT - CMS SOLUTIONS - DIGITAL MARKETING` | `indexed_unverified` (snippet-quoted) |
| Other menu items | About Us, Company, Careers, Portfolio, Contact | `indexed_unverified` (snippet-paraphrased) |
| Call-to-action link | "Get Started with us" (target URL unknown) | `indexed_unverified` (snippet-paraphrased) |
| Menu order, dropdown structure, mobile menu behaviour | `[CONFIRM NAVIGATION STRUCTURE]` | `placeholder` |
| Link to training site from main nav | `[CONFIRM WHETHER MAIN SITE LINKS TO training.bitbyteindia.com]` | `placeholder` |

### G3. Company introduction block
| Item | Value | Observed on | Label |
|---|---|---|---|
| Intro sentence | "BitByte Software Technologies located in Indore, with capabilities to service clients across M.P. is a rapidly growing Website Design, Development and Custom Software Development company." | `/careers/`, `/cms-development` | `indexed_unverified` (snippet-quoted) |
| Variant | "BitByte Software Technologies located in Indore, with capabilities to service Clients across M.P." (capital "C") | `/internet-of-things` | `indexed_unverified` (snippet-quoted, truncated) |
| Company name as used in the copy | "BitByte Software Technologies" | as above | `indexed_unverified`; **`conflict`** with "BitByte Software Technology" (CG-01) |

### G4. Contact block (footer / contact)
| Item | Value | Observed on | Label |
|---|---|---|---|
| Address | "402, 4th floor, Atulya IT Park, MPIDC, Khandwa Road Indore (M.P.), 452001" | `/cms-development`, `/careers/`, `/contact` | `indexed_unverified` (snippet-quoted) |
| Phone line | "Call us: 0731-2970998, +91-9993150998" | `/contact` (also `/careers/`, `/cms-development`) | `indexed_unverified` (snippet-quoted) |
| Email line | "Email us: info@bitbyteindia.com, indiabitbyte@gmail.com" | `/contact` (also `/careers/`) | `indexed_unverified` (snippet-quoted) |
| Office hours | `[CONFIRM OFFICE HOURS]` | — | `placeholder` |
| Map embed / directions | `[CONFIRM MAP LOCATION]` | — | `placeholder` |
| WhatsApp number | `[CONFIRM WHATSAPP NUMBER]` | — | `placeholder` |

### G5. Footer
| Item | Value | Label |
|---|---|---|
| Copyright line | "Copyright ©2023" (entity name not captured) | `indexed_unverified` (snippet-quoted, seen on `/careers/`). **Freshness concern:** the content may not have been updated since 2023. |
| Legal entity in copyright | `[CONFIRM LEGAL ENTITY NAME]` | `placeholder` / `conflict` (CG-03) |
| Footer links (privacy, terms, sitemap) | `[CONFIRM FOOTER LINKS]`: none captured | `placeholder` |
| Social links | `[CONFIRM SOCIAL MEDIA URLS]`: no social link was captured from the site itself. Candidates come from third parties only (CG-09). | `placeholder` |

---

## P1. Homepage

| Field | Value | Label |
|---|---|---|
| Original URL | `https://bitbyteindia.com/` (also indexed as `https://www.bitbyteindia.com/`) | `indexed_unverified` |
| Proposed route | `/` | — |
| Title | `IT Services and IT Business Solution Company` | `indexed_unverified` |
| Hero heading / subheading | `[CONFIRM HOMEPAGE HERO TEXT]` | `placeholder` |
| Sections (services overview, about, statistics, clients, testimonials, CTA) | `[CONFIRM HOMEPAGE SECTIONS]`: no homepage body text was returned by any search | `placeholder` |
| Statistics / claims | None captured. **Do not invent** (e.g. projects completed, clients, years). | `placeholder` |
| Images / banners | Unknown (see `ASSET_INVENTORY.md`) | `placeholder` |

## P2. About Us / Company

| Field | Value | Label |
|---|---|---|
| Original URL | `[CONFIRM ABOUT PAGE URL]`: "About Us" and "Company" appear as menu items, but no URL was indexed | `placeholder` |
| Proposed route | `/about` | — |
| Content | Only the intro sentence (G3) is known | `indexed_unverified` / `placeholder` |
| Mission, vision, values, team, history | `[CONFIRM ABOUT PAGE CONTENT]` | `placeholder` |
| Founding year | `[CONFIRM COMPANY FOUNDING YEAR]` | `conflict` (CG-02) |
| Team size | `[CONFIRM TEAM SIZE OR OMIT]` | `conflict` (CG-04) |
| "Company" menu item | Purpose unknown; possibly a dropdown parent for About Us / Careers | `placeholder` |

## P3. Services overview

| Field | Value | Label |
|---|---|---|
| Original URL | No dedicated overview page found. "SERVICES" appears as a menu parent. | `indexed_unverified` |
| Proposed route | `/services` | — |
| Services listed in the menu | Web Development, Internet of Things, Mobile App Development, CMS Solutions, Digital Marketing | `indexed_unverified` (snippet-quoted, in upper case in the menu) |
| Other services mentioned | Logo design, e-commerce websites, SEO and custom software appear in descriptions, but those descriptions come from the **excluded** training site. SEO is confirmed on the main site under Digital Marketing (P8). | **Not inventoried as main-site services** (CG-11) |

## P4. Service: Web Development

| Field | Value | Label |
|---|---|---|
| Original URL | `[CONFIRM WEB DEVELOPMENT PAGE URL]`: menu item exists; tried `/web-development`, not found in index | `placeholder` |
| Proposed route | `/services/web-development` | — |
| Content | `[CONFIRM WEB DEVELOPMENT PAGE CONTENT]` | `placeholder` |

## P5. Service: Mobile App Development

| Field | Value | Label |
|---|---|---|
| Original URL | `[CONFIRM MOBILE APP DEVELOPMENT PAGE URL]`: menu item exists; tried `/mobile-app-development`, not found in index | `placeholder` |
| Proposed route | `/services/mobile-app-development` | — |
| Content | `[CONFIRM MOBILE APP PAGE CONTENT]` (platforms such as Android, iOS or Flutter are **not** confirmed from the site) | `placeholder` |

## P6. Service: Internet of Things

| Field | Value | Label |
|---|---|---|
| Original URL | `http://bitbyteindia.com/internet-of-things` (indexed over **http**, apex host) | `indexed_unverified` |
| Proposed route | `/services/internet-of-things` | — |
| Title | `IT Services and IT Business Solution Company` | `indexed_unverified` |
| Definition paragraph | "IoT is a network of physical devices that can be embedded with software and other electronics so that data and information can be shared." | `indexed_unverified` (snippet-quoted) |
| Approach | "…refined approach to understand your business needs and find best-fit IoT solutions" (fragment); the page also claims cost-effective, efficient solutions | `indexed_unverified` (quoted fragment + paraphrase) |
| Service line headings | IoT Consulting · Integration & Implementation · Analytics & Insight · IoT Development | `indexed_unverified` (snippet-paraphrased list; exact heading wording unconfirmed) |
| IoT Consulting list | "Facilitating Roadmap Creation, Domain-based Value Stream Mapping, Business Case Preparation, Use Case Definition, Solution Blueprinting, Business KPIs and ROI Mapping." | `indexed_unverified` (snippet-quoted) |
| Integration & Implementation | End-to-end delivery covering sensor and equipment integration, machine-to-machine communication and business-intelligence integration, using partner platforms | `indexed_unverified` (snippet-paraphrased) |
| IoT Development | A team of IoT developers builds custom solutions for any business need | `indexed_unverified` (snippet-paraphrased) |
| Analytics & Insight | `[CONFIRM ANALYTICS & INSIGHT TEXT]` | `placeholder` |
| Industries | Healthcare, Manufacturing, Automobile, Retail, Energy, Construction, Smart Cities | `indexed_unverified` (snippet-paraphrased list) |
| Images / icons | Unknown | `placeholder` |

## P7. Service: CMS Solutions

| Field | Value | Label |
|---|---|---|
| Original URL | `https://bitbyteindia.com/cms-development` (no trailing slash) | `indexed_unverified` |
| Proposed route | `/services/cms-development` | — |
| Menu label | "CMS SOLUTIONS" (the page slug says "cms-development") | `indexed_unverified` |
| Main paragraph | "We provide custom wordpress development services for businesses spanning every sector and market. We offer the best set of WordPress plugins, advanced templates, and exceptional menu management options to our clients." | `indexed_unverified` (snippet-quoted; lower-case "wordpress" as returned) |
| Responsive design | "For responsive web design, we optimize the site for mobiles, tablets, etc." | `indexed_unverified` (snippet-quoted) |
| Optimisation | The page mentions performance, conversion and SEO optimisation for WordPress sites | `indexed_unverified` (snippet-paraphrased) |
| E-commerce | E-commerce platforms on WordPress are mentioned | `indexed_unverified` (snippet-paraphrased) |
| Non-WordPress CMS | None found | — |
| Shared blocks | Intro sentence (G3) and contact block (G4) | see G3/G4 |

## P8. Service: Digital Marketing

| Field | Value | Label |
|---|---|---|
| Original URL | `https://www.bitbyteindia.com/digital-marketing` | `indexed_unverified` |
| Proposed route | `/services/digital-marketing` | — |
| Intro | "Bitbyte evaluate your website traffic, determine the best online platforms to invest in, and continually maintain the balance between your marketing activities and the result we provide." | `indexed_unverified` (snippet-quoted; original grammar kept) |
| SEO lead-in | "Depending on your goals, and needs one, or a combination, of the below services may be right for your website." | `indexed_unverified` (snippet-quoted; original punctuation kept) |
| SEO service list | "Website SEO Audit - On-Page SEO - Off-Page SEO - SEO Content Development - Code Optimization - Local Business SEO" | `indexed_unverified` (snippet-quoted) |
| Social media | Social Media Optimization (SMO) and Social Media Marketing (SMM) | `indexed_unverified` (snippet-paraphrased) |
| Paid advertising list | "Pay Per Click (PPC) - Banner Ads - Display Ads - Social Media Ads" | `indexed_unverified` (snippet-quoted) |
| Ad targeting | Ads can target audiences by demographics, interests and online behaviour | `indexed_unverified` (snippet-paraphrased) |
| Pricing / packages | None found | — |

## P9. Portfolio

| Field | Value | Label |
|---|---|---|
| Original URL | `https://bitbyteindia.com/portfolio` | `indexed_unverified` |
| Proposed route | `/portfolio` (listing) + `/portfolio/:slug` (detail, if content exists) | — |
| Filter / category labels | Web Development · E-Commerce · Internet of Things | `indexed_unverified` (snippet-paraphrased) |
| Project names (as indexed) | Apna Gaadi · Manviya · Kissan Live · Robotronix · Fortitude · Electronics Pro · Xpression · Child Security | `indexed_unverified` (names quoted; the index **repeated** some names, probably because the same item shows under "All" and under its category, so the distinct count is 8) |
| Category per project | See table below. **Different index reads disagree.** | `conflict` (CG-07) |
| Descriptions, client names, years, technologies, live links | `[CONFIRM PORTFOLIO PROJECT DETAILS]`: none captured | `placeholder` |
| Detail pages | Unknown whether individual project pages exist | `placeholder` |
| Images | Unknown (see `ASSET_INVENTORY.md`) | `placeholder` |

| Project | Category as indexed | Confidence | Permission to display |
|---|---|---|---|
| Apna Gaadi | Web Development | Medium (consistent across two reads) | `[CONFIRM CLIENT CONSENT]` |
| Manviya | Web Development | Medium (consistent across two reads) | `[CONFIRM CLIENT CONSENT]` |
| Kissan Live | Web Development | Medium (consistent across two reads) | `[CONFIRM CLIENT CONSENT]` |
| Robotronix | Web Development (one read); unassigned (another) | Low, `conflict` | `[CONFIRM CLIENT CONSENT / RELATIONSHIP]` (CG-08) |
| Fortitude | Web Development (one read); unassigned (another) | Low, `conflict` | `[CONFIRM CLIENT CONSENT]` |
| Electronics Pro | E-Commerce | Medium (consistent across reads) | `[CONFIRM CLIENT CONSENT]` |
| Xpression | E-Commerce | Low (one read) | `[CONFIRM CLIENT CONSENT]` |
| Child Security | Internet of Things (one read); unassigned (another) | Low, `conflict` | `[CONFIRM CLIENT CONSENT]` |

## P10. Testimonials

| Field | Value | Label |
|---|---|---|
| Original URL / section | **None found** on the main site in any index | `placeholder` |
| Proposed route | Section on `/` and service pages, no standalone page unless requested | — |
| Content | `[CONFIRM TESTIMONIALS — TEXT, NAME, ROLE, COMPANY, WRITTEN CONSENT]` | `placeholder` |
| Note | Third-party directory reviews (ratings, reviewer comments) are **not** testimonials and are not inventoried. | — |

## P11. Pricing / engagement models

| Field | Value | Label |
|---|---|---|
| Original URL / section | **None found** in any index. The contact form asks for "Approx Budget", which suggests quote-based engagement. | `placeholder` |
| Proposed route | None until confirmed | — |
| Content | `[CONFIRM WHETHER PRICING OR ENGAGEMENT MODELS SHOULD BE PUBLISHED]` | `placeholder` |

## P12. Careers

| Field | Value | Label |
|---|---|---|
| Original URL | `https://www.bitbyteindia.com/careers/` (www host, **trailing slash**) | `indexed_unverified` |
| Proposed route | `/careers` | — |
| Title | `IT Services and IT Business Solution Company` | `indexed_unverified` |
| Culture copy | The page encourages technical training and certifications to expose staff to industry best practice, and focuses on nurturing people skills for performance at work. The leadership team is described as focused on quality and core values; work-life balance is mentioned. | `indexed_unverified` (snippet-paraphrased; the returned sentence was in third person, which suggests rewording, so the **original wording is unconfirmed**) |
| Section heading | "Current Opportunities" | `indexed_unverified` (snippet-quoted) |
| Open positions | None captured. `[CONFIRM CURRENT OPENINGS]` | `placeholder` |
| How to apply | Not captured. `[CONFIRM APPLICATION METHOD — EMAIL OR FORM]` | `placeholder` |
| Footer | "Copyright ©2023" (G5) | `indexed_unverified` |

## P13. Contact

| Field | Value | Label |
|---|---|---|
| Original URL | `https://bitbyteindia.com/contact` | `indexed_unverified` |
| Proposed route | `/contact` | — |
| Headings | "Get Started Now"; "Let's Connect!" | `indexed_unverified` (snippet-quoted) |
| Contact details | See G4 | `indexed_unverified` |

### P13a. Contact form (as indexed)
| # | Field label (as returned) | Required marker | Label |
|---|---|---|---|
| 1 | Full Name* | `*` | `indexed_unverified` (snippet-quoted) |
| 2 | Company Name* | `*` | `indexed_unverified` (snippet-quoted) |
| 3 | Company Location* | `*` | `indexed_unverified` (snippet-quoted) |
| 4 | Work Email Address* | `*` | `indexed_unverified` (snippet-quoted) |
| 5 | Phone Number* | `*` | `indexed_unverified` (snippet-quoted) |
| 6 | Approx Budget* | `*` | `indexed_unverified` (snippet-quoted); field type (free text or dropdown) and options unknown |
| 7 | Tell us about your project* | `*` | `indexed_unverified` (snippet-quoted) |
| 8 | Captcha* | `*` | `indexed_unverified` (snippet-quoted); CAPTCHA type unknown |

| Behaviour | Value | Label |
|---|---|---|
| Submit button text | `[CONFIRM SUBMIT BUTTON TEXT]` | `placeholder` |
| Validation messages, success/failure messages | `[CONFIRM FORM MESSAGES]` | `placeholder` |
| Consent / privacy text | **None captured.** `[CONFIRM CONSENT TEXT]` (the rebuild needs one; see `CONTENT_GAPS.md`) | `placeholder` |
| Where submissions go today (email or database) | `[CONFIRM CURRENT FORM DESTINATION]` | `placeholder` |
| Whether the form currently works | Unknown | `placeholder` |

## P14. Privacy policy / Terms

| Field | Value | Label |
|---|---|---|
| Original URL | **Not found in any index.** Existence is **unknown, not confirmed absent**: the site couldn't be inspected directly. | `placeholder` |
| Proposed routes | `/privacy-policy`, `/terms` (new pages are needed regardless, for the lead form under the DPDP Act 2023) | — |
| Content | `[CONFIRM EXISTING PRIVACY POLICY / TERMS OR APPROVE NEW ONES]` | `placeholder` |

## P15. Other pages
| Candidate | Status |
|---|---|
| Blog / news | Not found in any index; unknown |
| Sitemap (`/sitemap.xml`), `robots.txt` | Could not be fetched |
| 404 page | Unknown |
| Individual portfolio pages | Unknown |
| "Get Started with us" target | Unknown; may be `/contact` |

---

## Coverage summary

| Page | Indexed URL known | Some body text captured | Fully captured |
|---|:-:|:-:|:-:|
| Home | ✓ | — | — |
| About / Company | — | intro sentence only | — |
| Services overview | — (menu only) | menu list | — |
| Web Development | — | — | — |
| Mobile App Development | — | — | — |
| Internet of Things | ✓ | ✓ (partial) | — |
| CMS Solutions | ✓ | ✓ (partial) | — |
| Digital Marketing | ✓ | ✓ (partial) | — |
| Portfolio | ✓ | names only | — |
| Testimonials | — | — | — |
| Pricing | — | — | — |
| Careers | ✓ | ✓ (partial) | — |
| Contact | ✓ | ✓ (form fields + details) | — |
| Privacy / Terms | — | — | — |

**No page is fully captured.** The inventory must be completed through one of the access options in `CONTENT_GAPS.md` §A before it can be signed off.
