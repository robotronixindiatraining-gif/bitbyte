# Content Gaps, Conflicts and Confirmations Required

| | |
|---|---|
| **Retrieval date** | 2026-10-15 |
| **Purpose** | Everything that is missing, contradictory, inaccessible or unverified. Nothing listed here may appear on the new website as fact until it is resolved. |
| **Owner** | Business owner / super admin, who answers each item. The answer and date are then recorded here. |

## A. Access blocker (root cause of most gaps)

**No page of `bitbyteindia.com` could be loaded from the build environment.** The environment's network policy only allows package registries; every other host (even `example.com`) is refused. **This is not evidence that the website is down.** Details are in `STAGE_LOG.md` §2.

Options for completing the inventory (pick any one):

| Option | What the owner does | What I then do |
|---|---|---|
| **A1** | Add `bitbyteindia.com` and `www.bitbyteindia.com` to the cloud environment's **Allowed domains** (environment settings → Network access) | Crawl every page with headless Chromium: full rendered text, navigation, footer, forms, lazy-loaded sections, every asset downloaded. Upgrades items to `verified_live`. |
| **A2** | Provide a hosting backup or site files (HTML/PHP/WordPress export + `uploads/` / images folder) | Extract all content and assets. Upgrades items to `verified_source`. |
| **A3** | Save each page in a browser ("Save page as → complete") plus full-page screenshots, and supply them | Same as A2 for the pages supplied |
| **A4** (complementary) | Export Google Search Console "Pages" and "Performance → Pages" | Complete the redirect map with every URL that has traffic |

---

## B. Conflicts (`conflict`): a decision is required

| ID | Topic | What the sources say | Decision needed | Placeholder until resolved |
|---|---|---|---|---|
| **CG-01** | Company name | Site copy (indexed): "BitByte Software Technologies". Instagram, LinkedIn, Clutch and the brief: "BitByte Software Technology". | Exact public trading name and capitalisation | `[CONFIRM COMPANY NAME]` |
| **CG-02** | Founding year | Clutch / The Manifest: 2016. LinkedIn: 2017. The registration number on Zauba Corp contains "2017". Not stated on the site, as far as indexed. | Year to publish, or omit | `[CONFIRM COMPANY FOUNDING YEAR]` |
| **CG-03** | Legal entity and status | Third parties name "BITBYTE SOFTWARE TECHNOLOGY PRIVATE LIMITED" (CIN U74999MP2017PTC042630). Zauba Corp lists the status as "Strike Off"; Crunchbase says "Active". | The legal entity (if any) for the copyright line, privacy policy and structured data. **Nothing about legal status will be published without the owner's statement.** | `[CONFIRM LEGAL ENTITY NAME]` |
| **CG-04** | Team size | ZoomInfo 1–10; LinkedIn 2–10; Tracxn 11; Clutch 10–49 | Publish a figure, or omit (recommended: omit unless confirmed) | `[CONFIRM TEAM SIZE OR OMIT]` |
| **CG-05** | Landline number | Main site (indexed): 0731-2970998. The **excluded** training site's About page (indexed): 0731-4700998. Directories: +91 731 297 0998 (the same as 0731-2970998). | Which numbers are current, and which to show publicly. Is +91-9993150998 a mobile/WhatsApp line? | `[CONFIRM CONTACT PHONE NUMBERS]` |
| **CG-07** | Portfolio categories | Index reads disagree on whether Robotronix, Fortitude and Child Security sit under Web Development, IoT or no category | Correct category for each project | — |

## C. Missing content (`placeholder`)

| ID | Item | Why it matters | Placeholder |
|---|---|---|---|
| **CG-06** | Public email addresses | The site shows both `info@bitbyteindia.com` and `indiabitbyte@gmail.com`. Recommend showing only the domain address. | `[CONFIRM CONTACT EMAIL]` |
| **CG-07** | Portfolio project details | Only 8 project names are known: no descriptions, clients, years, technologies, links or images | `[CONFIRM PORTFOLIO PROJECT DETAILS]` |
| **CG-07b** | Client consent | Permission to name each client and show screenshots or logos | `[CONFIRM CLIENT CONSENT]` |
| **CG-08** | "Robotronix" project | A company named Robotronix Engineering Tech Pvt. Ltd. exists in Indore (third-party listings). Is this a client project or a related/affiliated company? This decides how it can be presented: a related company must not be shown as an independent client endorsement. | `[CONFIRM CLIENT CONSENT / RELATIONSHIP]` |
| **CG-09** | Social media links | None captured from the site itself. Third-party candidates: Instagram `@bitbyteindia`; LinkedIn `/company/bitbyte-software-technology`; a Facebook page at `facebook.com/itparkindore/` titled "Bitbyte Software Technology". All unverified. | `[CONFIRM SOCIAL MEDIA URLS]` |
| **CG-10** | Content freshness | The footer reads "Copyright ©2023". Service and career content may be outdated. | Owner reviews each service description before migration |
| **CG-11** | Services list | The menu has 5 services. Logo design, e-commerce websites, custom software and copywriting are mentioned only on the **excluded** training site. Are any of these offered as main-site services? | `[CONFIRM SERVICE LIST]` |
| **CG-12** | Homepage content | No hero, section, statistic or CTA text captured | `[CONFIRM HOMEPAGE HERO TEXT]`, `[CONFIRM HOMEPAGE SECTIONS]` |
| **CG-13** | About page content | URL and body unknown (mission, vision, history, team) | `[CONFIRM ABOUT PAGE CONTENT]` |
| **CG-14** | Web Development page | URL and body unknown | `[CONFIRM WEB DEVELOPMENT PAGE CONTENT]` |
| **CG-15** | Mobile App Development page | URL and body unknown; platforms unconfirmed | `[CONFIRM MOBILE APP PAGE CONTENT]` |
| **CG-16** | IoT "Analytics & Insight" text | Heading known, body not captured | `[CONFIRM ANALYTICS & INSIGHT TEXT]` |
| **CG-17** | Testimonials | **None found on the main site.** Third-party directory ratings and reviews are not testimonials and won't be used. | `[CONFIRM TESTIMONIALS — TEXT, NAME, ROLE, COMPANY, WRITTEN CONSENT]` |
| **CG-18** | Pricing / engagement models | **None found.** The contact form asks for "Approx Budget". | `[CONFIRM WHETHER PRICING OR ENGAGEMENT MODELS SHOULD BE PUBLISHED]` |
| **CG-19** | Careers openings and application method | Only the "Current Opportunities" heading was captured | `[CONFIRM CURRENT OPENINGS]`, `[CONFIRM APPLICATION METHOD — EMAIL OR FORM]` |
| **CG-20** | Contact form details | Submit text, validation and success messages, CAPTCHA type, "Approx Budget" options, current submission destination | `[CONFIRM FORM MESSAGES]`, `[CONFIRM CURRENT FORM DESTINATION]` |
| **CG-21** | Consent text and privacy policy | No consent text or privacy policy captured. **Required** for the new lead form under India's DPDP Act 2023. | `[CONFIRM CONSENT TEXT]`, `[CONFIRM EXISTING PRIVACY POLICY / TERMS OR APPROVE NEW ONES]` |
| **CG-22** | Office hours, map pin, WhatsApp | Not captured (one directory says "closed Sunday", unverified) | `[CONFIRM OFFICE HOURS]`, `[CONFIRM MAP LOCATION]`, `[CONFIRM WHATSAPP NUMBER]` |
| **CG-23** | SEO metadata | Every indexed page has the same `<title>`; no meta descriptions captured | `[CONFIRM META DESCRIPTIONS]` (new ones will be written in a later stage, on request) |
| **CG-24** | Navigation details | "Company" menu item purpose, "Get Started with us" target, dropdown structure | `[CONFIRM NAVIGATION STRUCTURE]` |
| **CG-25** | Statistics and claims | None captured. None will be invented (projects delivered, clients, years of experience, ratings). | Owner supplies figures with evidence, or the stats section is omitted |
| **CG-26** | Logo and brand assets | Nothing retrieved (see `ASSET_INVENTORY.md`) | Owner supplies the vector logo |
| **CG-27** | Canonical host | Both `www` and apex hosts are indexed | `[CONFIRM CANONICAL HOST]` |

## D. Unavailable vs confirmed absent

**No page has been confirmed to not exist.** Every "not found" in the inventory means *not present in search indexes*, which is consistent both with the page not existing and with it simply not being indexed.

| Page | Status |
|---|---|
| Web Development, Mobile App Development, About Us | **Exist** (linked in the indexed menu); URL and content unavailable |
| Testimonials, Pricing, Privacy policy, Terms, Blog, project detail pages | **Unknown.** Not indexed; existence unconfirmed |
| `robots.txt`, `sitemap.xml`, `favicon.ico` | **Unknown.** Could not be fetched |

## E. Third-party information (context only, not site content)

These facts came from third parties. They are **not** in the content inventory and must not be published without confirmation:
- Directory listing: 4.8/5 average from 105 reviews (Yappe). Not to be republished.
- Instagram bio tech list: "Python /ML /AI /DS React /Node /Mongo /Express JAVA / Flutter".
- Landmark: "opposite to Indian Coffee House, Bhanvarkuan" (Yappe).
- Clutch: service mix led by mobile app and web development; Indore; 2016; 10–49 employees; no reviews listed. One search summary claimed a client review from "Xpression Graphics" exists, and another said the profile has no reviews (**conflicting and unverified; not used**).

## F. Resolution log
| ID | Answer | Answered by | Date |
|---|---|---|---|
| — | No items resolved yet | — | — |
