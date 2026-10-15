# Design System

| | |
|---|---|
| **Status** | Stage 02 specification. Proposed, awaiting approval. |
| **Brand palette** | ⚠️ **PROVISIONAL.** The logo hasn't been obtained (`ASSET_INVENTORY.md` A-01). All colour values are a starting point and will be re-derived from the actual logo before launch (D-024). |
| **Scope** | Public website and admin UI. A complete redesign: nothing is copied from the existing site's design. |
| **Implementation** | Tailwind CSS v4 with tokens defined once in `client/src/styles/index.css` (`@theme`). Components use tokens only, never raw hex values. |

---

## 1. Design principles
1. **Engineered, not decorated.** A premium B2B technology studio: precise grids, confident type, generous whitespace and one accent colour used with intent.
2. **Content leads.** Real services, real projects and verified facts. No stock clichés, fake metrics or filler badges. Sections without verified content are hidden, not padded.
3. **One memorable motif.** The *BitGrid*, a field of 8-cell "byte" rows, ties the visual identity to the company name. It is used sparingly: hero, empty states, section accents.
4. **Calm motion.** Motion explains (navigation, filtering, disclosure) or adds one moment of polish (hero intro, section reveal). Nothing loops or competes with reading.
5. **Accessible by default.** WCAG 2.2 AA, with keyboard-first and reduced-motion support built into the primitives, not added later.
6. **Fast on a mid-range Android phone on 4G.** Budgets in §11 are acceptance criteria.

## 2. Colour (PROVISIONAL)

### 2.1 Palette tokens
| Token | Hex | Role |
|---|---|---|
| `navy-950` | `#070F24` | Darkest surface: hero, footer, dark sections |
| `navy-900` | `#0B1A3A` | Dark cards; headings on light surfaces (alternative to `neutral-900`) |
| `navy-800` | `#12275A` | Raised elements on dark; BitGrid "off" cells |
| `navy-700` | `#1C3A7A` | Borders and dividers on dark |
| `accent-700` | `#1844B8` | Link hover / pressed on light |
| `accent-600` | `#1F55E0` | **Primary on light:** buttons, links, focus ring |
| `accent-500` | `#2F6BFF` | Brand highlight (large text / non-text UI only on white) |
| `accent-400` | `#5B8CFF` | **Primary on dark:** buttons, active states |
| `accent-300` | `#8FB0FF` | Links and highlights on dark; focus ring on dark |
| `accent-100` | `#E6EEFF` | Tinted backgrounds, icon tiles, selected chips |
| `neutral-0` | `#FFFFFF` | Base surface |
| `neutral-50` | `#F7F8FB` | Muted section background, admin app background |
| `neutral-100` | `#EEF1F6` | Hover fills, table stripes |
| `neutral-200` | `#DDE3EC` | Borders, dividers |
| `neutral-300` | `#C3CBD8` | Strong borders; secondary text **on dark** |
| `neutral-400` | `#97A1B5` | Disabled icons, decorative only (**never text on light**) |
| `neutral-500` | `#64708A` | Meta text (captions, timestamps) |
| `neutral-600` | `#4B5670` | Secondary body text |
| `neutral-700` | `#374156` | Body text |
| `neutral-900` | `#111827` | Headings on light |
| `success-700` | `#0E7A3D` | Published, success messages |
| `warning-700` | `#8A5A00` | Unpublished changes, warnings |
| `danger-600` | `#C42B2B` | Errors, destructive actions, placeholders |

### 2.2 Verified contrast ratios (WCAG 2.x formula, computed for these exact values)
| Foreground on background | Ratio | Allowed use |
|---|---|---|
| `neutral-900` on white | 17.74 | All text |
| `neutral-700` on white | 10.23 | Body text |
| `neutral-700` on `neutral-50` | 9.63 | Body text on muted sections |
| `neutral-600` on white | 7.33 | Secondary text |
| `neutral-600` on `neutral-100` | 6.48 | Secondary text on hover fills |
| `neutral-500` on white | 4.97 | Small meta text (AA) |
| `neutral-400` on white | **2.60** | ❌ Decorative / disabled only |
| `accent-600` on white | 6.12 | Links, buttons (white text on `accent-600` is also 6.12) |
| `accent-600` on `neutral-50` | 5.76 | Links on muted sections |
| `accent-700` on `accent-100` | 7.05 | Chips, badges |
| `accent-500` on white | 4.50 | Large text / UI only (borderline for body text, so avoid) |
| White on `navy-950` / `navy-900` / `navy-800` | 19.04 / 17.17 / 14.35 | All text on dark |
| `neutral-300` on `navy-900` | 10.51 | Secondary text on dark |
| `neutral-400` on `navy-900` | 6.61 | Meta text on dark |
| `accent-300` on `navy-950` | 8.91 | Highlights and links on dark |
| `accent-400` on `navy-950` | 6.02 | Primary button on dark (`navy-950` text on `accent-400` fill) |
| `accent-400` on `navy-900` | 5.43 | Accent text on dark cards |
| `accent-500` on `navy-900` | 3.82 | Non-text UI only (icons, borders) |
| `accent-600` on `navy-900` | **2.81** | ❌ Never on dark surfaces |
| `success-700` / `warning-700` / `danger-600` on white | 5.43 / 5.93 / 5.63 | Status text |

**Rules:** use one accent hue per view. No multicolour gradients. Gradients are limited to (a) a single soft accent radial glow on dark heroes at ≤ 20 % opacity and (b) navy-to-navy depth. Never put body text on images; use a solid or ≥ 80 % scrim panel.

### 2.3 Semantic tokens (what components actually use)
`--color-bg`, `--color-bg-muted`, `--color-surface`, `--color-surface-raised`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-border`, `--color-primary`, `--color-primary-fg`, `--color-link`, `--color-focus`, `--color-success`, `--color-warning`, `--color-danger`.

Each section variant (`light`, `muted`, `dark`) remaps these tokens, so components work unchanged on any surface. This structure also allows a full dark mode later (D-029) without touching components.

### 2.4 Replacing the provisional palette with the real logo (D-024)
1. Obtain the vector logo (SVG/AI/EPS/PDF).
2. Extract its exact brand colour(s).
3. Build the `accent-*` scale around the logo's primary hue (OKLCH lightness steps matched to the current scale). If the logo has a dark colour, map it to `navy-*`.
4. Re-run the contrast table above (the script lives in `scripts/contrast-check.js`, added in Stage 06) and fix any failing pair.
5. Record the new values and results here and in `DECISIONS.md`.
**Until then:** the header shows the company name as a text wordmark from `settings.general.companyName`. **No substitute logo is designed or invented.**

## 3. Typography
| Role | Family | Notes |
|---|---|---|
| Display & headings | **Plus Jakarta Sans Variable** (600–800) | Geometric and contemporary; strong at large sizes |
| Body & UI | **Inter Variable** (400–600) | Excellent legibility at small sizes and in dense admin UI |
| Technical accents | **JetBrains Mono** (500) | Eyebrows, tech tags, step numbers. Sparing use. |

Self-hosted via `@fontsource-variable/*` (D-023): latin subset, `font-display: swap`, only Jakarta 700 and Inter 400 preloaded, and size-adjusted fallbacks to avoid layout shift.

### 3.1 Type scale (fluid, 360 px → 1440 px)
| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `display` | `clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem)` (40→72 px) | 1.05 | −0.02em | Home hero |
| `h1` | `clamp(2.25rem, 1.7rem + 2.2vw, 3.5rem)` (36→56) | 1.1 | −0.02em | Page heroes |
| `h2` | `clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem)` (28→40) | 1.15 | −0.015em | Section headings |
| `h3` | `clamp(1.25rem, 1.15rem + 0.5vw, 1.625rem)` (20→26) | 1.25 | −0.01em | Card titles |
| `h4` | 1.125rem | 1.35 | 0 | Sub-blocks |
| `lead` | `clamp(1.0625rem, 1rem + 0.3vw, 1.25rem)` | 1.6 | 0 | Hero and section intros |
| `body` | 1rem (16 px) | 1.65 | 0 | Paragraphs |
| `small` | 0.875rem | 1.5 | 0 | Meta, form help |
| `eyebrow` | 0.75rem, mono, uppercase | 1.4 | 0.12em | Section labels ("SERVICES") |

**Rules:** body measure 60–75 characters (`max-w-[68ch]`). One `h1` per page with no skipped levels; the section heading level is set by the renderer, not the admin. Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`.

## 4. Layout, spacing & shape
- **Spacing scale:** 4 px base (Tailwind default). Common steps: 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Section padding:** `default` = 80 px mobile / 112 px tablet / 128 px desktop; `compact` = 56 / 72 / 88.
- **Container:** max-width 1240 px (content), 1440 px (wide media). Side gutters 20 px (< 640), 32 px (≥ 640), 40 px (≥ 1024).
- **Grid:** 4 columns (mobile), 8 (tablet), 12 (desktop); gap 24 px / 32 px.
- **Breakpoints:** `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Mobile-first; designs are checked at 360, 390, 768, 1024, 1280 and 1440.
- **Radii:** `sm 6px` (inputs, chips) · `md 10px` (buttons) · `lg 16px` (cards) · `xl 24px` (feature panels, media) · `full` (pills, avatars).
- **Borders:** 1 px `neutral-200` on light; `white/8%` on dark.
- **Shadows** (navy-tinted, subtle):
  - `sm`: `0 1px 2px rgb(7 15 36 / .06)`
  - `md`: `0 2px 4px rgb(7 15 36 / .04), 0 8px 24px -8px rgb(7 15 36 / .12)`
  - `lg`: `0 24px 48px -16px rgb(7 15 36 / .20)`
  - `glow` (dark only): `0 0 0 1px rgb(91 140 255 / .25), 0 16px 40px -16px rgb(47 107 255 / .45)`
- **Surface rhythm:** sections alternate `light` / `muted` / `dark`. **Never two `dark` sections in a row.** The admin page editor warns about this.

## 5. Iconography & imagery
- **Icons:** Lucide (`lucide-react`), 1.75 px stroke, 20 px inline and 24 px in tiles. Services choose from a **curated list** of ~40 icons stored by name in the CMS. Icon tiles are 44 × 44, `accent-100` fill and `accent-700` icon on light; `navy-800` fill and `accent-300` icon on dark.
- **Photography and screenshots:** real project screenshots only (with permission), shown in a simple frame: `radius-xl`, 1 px border, `shadow-md`. No fake device mock-ups.
- **Aspect ratios:** portfolio cards 16:10, split-content images 4:3, avatars 1:1, OG images 1200 × 630.
- **Placeholders:** `media.dominantColor` fills the box while the image loads; width and height are always set (no CLS).
- **Formats:** AVIF → WebP → JPEG via `<picture>`/`srcset` (widths 480–1920). `loading="lazy"` except the LCP image (`fetchpriority="high"`).
- **Illustration:** BitGrid variants only (§9.1). No generic 3D/isometric stock illustrations.

## 6. Motion
| Token | Value |
|---|---|
| `duration-fast` | 150 ms (colour, opacity on hover) |
| `duration-base` | 200 ms (transforms on hover, menus) |
| `duration-slow` | 320 ms (drawers, accordions) |
| `duration-reveal` | 560 ms (scroll reveals) |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |

- **Scroll reveal:** opacity 0 → 1 and `translateY(12px)` → 0, once per element, triggered at 15 % visibility by IntersectionObserver. Stagger 60 ms, max 6 items per group. **Content is visible by default.** The hidden start state is only applied after JS confirms support, so no-JS visitors and crawlers always see the content.
- **Hero intro:** BitGrid "on" cells fade in with a staggered cascade over ~1.2 s, once. Static afterwards.
- **Filtering and route changes:** native **View Transitions API** (`document.startViewTransition`) as progressive enhancement; unsupported browsers update instantly (D-017). **No animation library at launch.**
- **Only `transform` and `opacity` animate.** No scroll-jacking, parallax, cursor effects, auto-advancing carousels or looping animation.
- **`prefers-reduced-motion: reduce`:** reveals, hero cascade and view transitions are disabled; state changes are instant; hover transforms are removed (colour changes stay).

## 7. Interaction states
| State | Spec |
|---|---|
| Focus | `:focus-visible` → 2 px solid outline, 2 px offset; `accent-600` on light, `accent-300` on dark. Never removed without an equivalent replacement. |
| Hover (buttons) | Background one step darker (`accent-700` on light, `accent-300` on dark), 150 ms |
| Hover (cards) | `translateY(-2px)`, border → `accent-300` (light) / `accent-400/40%` (dark), `shadow-md`, arrow icon `translateX(4px)`. Only under `@media (hover: hover)`. |
| Hover (links) | Underline thickens from 1 px to 2 px (`text-underline-offset: 4px`) |
| Active / pressed | `scale(0.98)` on buttons (removed under reduced motion) |
| Disabled | 50 % opacity, `cursor: not-allowed`, still focusable when explanatory |
| Loading | Button keeps its width and shows a spinner + `aria-busy="true"`; skeletons for content lists |
| Error | `danger-600` border + message below the field, linked via `aria-describedby` |

Nothing depends on hover: every hover reveal also exists in the default or focus state.

## 8. Components (primitives in `client/src/components/ui`)
| Component | Variants / notes |
|---|---|
| `Button` | `primary`, `secondary` (outline), `ghost`, `danger`; sizes `sm 36px`, `md 44px`, `lg 52px`; surface-aware; renders `<a>` when given `href` |
| `Link` | inline / standalone-with-arrow; external links get `rel="noopener noreferrer"` and a visually-hidden "(opens in new tab)" |
| `Container`, `Section` | `Section` applies `variant.background` / `variant.spacing` and the semantic token remap |
| `Heading`, `Text`, `Eyebrow` | level and visual size are separate props |
| `Card` | `default`, `interactive` (whole-card link with one accessible name), `feature` |
| `Badge`, `Chip` | status badges; filter chips (`aria-pressed`) |
| `Field`, `Input`, `Textarea`, `Select`, `Checkbox` | label above, required marker "*" + hidden "required", help text, error text |
| `Dialog`, `Drawer` | focus trap, `Esc` closes, focus returns to the trigger, background `inert` |
| `Disclosure` / `Accordion` | button + region, `aria-expanded`; used by FAQ and mobile nav |
| `Tabs` | admin only |
| `Toast` | `aria-live="polite"`; errors `assertive` |
| `Skeleton`, `EmptyState` | `EmptyState` uses a small BitGrid illustration |
| `ResponsiveImage` | `<picture>` with variants, dominant-colour placeholder, required width/height |
| `Logo` | renders `settings.general.logo`; **falls back to a text wordmark** (no invented logo) |
| `BitGrid` | §9.1 |

## 9. Section designs (renderers for the types in `DATABASE_SCHEMA.md` §4)

### 9.1 `hero`: the signature section
- **Surface:** `navy-950` with a single soft `accent-500` radial glow (top-right, ≤ 20 %) and a 4 %-opacity grid-line texture.
- **Desktop (≥ 1024):** 12-column split. Left 7 columns: eyebrow (mono, `accent-300`), `display` heading in white with the `highlight` phrase in `accent-300`, `lead` subheading in `neutral-300`, then primary CTA (`accent-400` fill, `navy-950` text) and secondary CTA (white outline). Right 5 columns: the **BitGrid**.
- **BitGrid:** an inline SVG (< 4 KB, `aria-hidden`) of 8 columns (one byte) × 8–10 rows of 12 px rounded squares with 6 px gaps. "Off" cells are `navy-800` with a 1 px `navy-700` stroke; ~15 % of cells are "on" in `accent-500`/`accent-400`, arranged so a few rows read as binary of the letters **B·B**. The cells cascade in once on load, then stay static.
- **Mobile:** text first, CTAs full-width stacked (48 px tall), BitGrid reduced to a 8 × 3 strip above the eyebrow. Hero height is driven by content (not `100vh`), so nothing gets cut off on short screens.
- **`visual: 'image'`** (inner pages): an image panel replaces the BitGrid, with `radius-xl`, preloaded if it's the LCP.
- Optional trust row below the CTAs renders **only** from a published `stats` section. Nothing is shown by default.

### 9.2 `serviceGrid`: bento layout
- **≥ 1024:** 3-column bento. The first (or featured) service spans 2 columns × 2 rows with a larger summary, its first 3 offerings as chips, and a faint BitGrid corner accent. The rest are standard cards. The layout adapts for 3–8 services so there is never a lone orphan card (the last row stretches).
- **768–1023:** 2 columns. **< 768:** a single column of compact horizontal cards (icon left, title + summary, arrow right).
- **Card:** icon tile, `h3` title, 2–3 line summary, "Explore service →". The whole card is one link. The `list` layout gives a numbered editorial list (mono numbers 01–05) for denser pages.

### 9.3 Service detail page (fixed template from the `services` model)
1. Dark hero (`h1`, icon tile, intro as lead text, CTA).
2. **Offerings:** numbered panels (`01 IoT Consulting`…), each with a description and a two-column checklist of `items` (check icons in `accent-600`).
3. **Industries:** a chip cloud.
4. **Process:** a horizontal stepper on desktop with a connecting line; vertical on mobile.
5. **Technologies:** mono tag list.
6. Related projects: 2–3 portfolio cards.
7. FAQ accordion.
8. CTA banner.

Empty fields hide their block.

### 9.4 `projectShowcase` and portfolio
- **Filter bar:** "All" plus category chips (`aria-pressed`), horizontally scrollable on mobile with edge fades. A polite live region announces "Showing 3 projects: E-Commerce". Filtering uses a view transition.
- **Grid:** the first featured project is full-width (16:10 → 21:9 on xl, image left 60 % / text right 40 %), the rest in a 2-column grid. Card: framed image with dominant-colour placeholder and a 1.03 scale on hover, category chip, `h3` title, one-line summary, mono tech tags.
- **Project detail:** title block (category, year, client if permitted, tech tags) → full-width cover → Overview / Challenge / Solution / Outcome in a reading column with a **sticky metadata sidebar** on desktop → gallery (lightbox dialog, keyboard arrows, captions) → "Next project" → CTA.

### 9.5 Other sections
| Type | Design |
|---|---|
| `richText` | Reading column (`68ch`), styled prose (headings, lists with accent markers, blockquote with left accent rule, tables for legal pages) |
| `featureList` | 2–4 column grid of icon + title + text; on dark, cards use `navy-900` and the `glow` shadow on hover |
| `processSteps` | Mono step numbers and connecting line; vertical below 768 |
| `splitContent` | 4:3 framed image + text, alternating sides; image goes first on mobile |
| `stats` | 2–4 large numbers in `display` weight with a label and optional footnote. **Only verified figures.** |
| `testimonials` | Editorial layout: a large quote mark, the quote in `h3` size, author + role + company + optional photo. Multiple quotes use a static grid; **no auto-advancing carousel**. |
| `ctaBanner` | Dark panel (`radius-xl`, BitGrid edge accent), heading + text + two CTAs; full-bleed on mobile |
| `faq` | Accordion (one item open at a time optional); emits FAQPage JSON-LD |
| `engagementModels` | 1–4 cards; the highlighted card gets an accent border + "Recommended" chip; `priceDisplay` shown only if provided |
| `contactForm` | §9.7 |
| `jobList` | Job cards (title, type badge, location, experience, "View role →"); the CMS empty-state text when none are open |
| `clientLogos` | Monochrome logos (`neutral-500`, full colour on hover), 4–6 per row; only with permission |

### 9.6 Navigation
- **Header (desktop ≥ 1024):** 72 px; logo/wordmark left, primary nav centre-right, CTA button right. Over a dark hero it starts transparent with white text. After 16 px of scroll it becomes `white/90` with backdrop blur, a bottom border and dark text. The height change uses a transform, not a layout change.
- **Services menu:** a disclosure button (not hover-only; hover opens after a 120 ms intent delay) opening a **mega-panel**: each service with icon, title and one-line summary from the CMS, plus a footer row linking "All services". Arrow keys move between items, `Esc` closes and returns focus, and clicking outside closes it.
- **Mobile (< 1024):** 64 px header with a menu button (`aria-expanded`, `aria-controls`). It opens a **full-screen drawer** (dialog semantics, focus trap, `inert` background, scroll lock) with 52 px tap rows, Services as an accordion, the CTA, and bottom quick actions: call, e-mail, WhatsApp (if configured).
- **Active page:** `aria-current="page"` with an accent underline (desktop) or accent bar (mobile).
- **Skip link:** "Skip to content" is the first focusable element.

### 9.7 Contact page and form
- **Layout:** two columns on desktop. Left: heading, intro and contact cards (address, phones as `tel:` links, e-mails as `mailto:`, hours), plus a **"Show map" button** that loads the embed only on request (privacy + performance). Right: the form in a raised card. Stacked on mobile, with the form first.
- **Fields:** exactly those in `DATABASE_SCHEMA.md` §3.11. Labels above inputs, `autocomplete` attributes (`name`, `organization`, `email`, `tel`), budget as a `<select>` from settings, message `<textarea>` with a character counter, and a consent checkbox with CMS text and a privacy-policy link.
- **Validation:** inline on blur, plus an error summary on submit that lists errors as links and moves focus to the summary.
- **Submit:** loading state; on success the form is replaced by the success message, with focus moved to its heading. On a network error the entered data is kept and a retry message shown.
- **Spam:** hidden honeypot (off-screen, `tabindex=-1`, `aria-hidden`) and time check. Turnstile widget only if enabled (D-020).

### 9.8 Footer
`navy-950`. Four columns:
1. Wordmark/logo, tagline and social icons (each with an accessible label).
2. Services.
3. Company links.
4. Contact block.

A bottom bar holds `© {current year} {copyrightHolder}` and legal links. The BitGrid edge accent appears at the top. Columns stack on mobile, with the services list in an accordion.

## 10. Page compositions (default section order; the admin can reorder within template rules)
| Page | Default sections |
|---|---|
| Home | hero (BitGrid) → serviceGrid (bento) → splitContent (about teaser) → projectShowcase (featured) → processSteps → testimonials *(hidden until any exist)* → stats *(hidden until verified)* → ctaBanner |
| About | hero (image) → richText → featureList (values) → stats *(if verified)* → ctaBanner |
| Services | hero → serviceGrid (list or bento) → processSteps → engagementModels *(only if approved)* → faq → ctaBanner |
| Portfolio | hero (compact) → projectShowcase (all, filters) → ctaBanner |
| Careers | hero → featureList (culture: training, certifications, people skills) → jobList → ctaBanner |
| Contact | hero (compact) → contactForm → faq |
| Legal | richText |

## 11. Accessibility & performance acceptance criteria
- **Accessibility:** WCAG 2.2 AA; axe reports zero violations on every template; full keyboard operation; visible focus; touch targets ≥ 24 px (nav and buttons ≥ 44 px); `lang="en"`; landmarks (`header`, `nav`, `main`, `footer`); alt text enforced by the CMS; reduced motion respected; zoom to 200 % and 320 px reflow without horizontal scroll.
- **Performance (mobile, Lighthouse, 4G throttling):**
  - Performance, Accessibility, Best Practices and SEO ≥ 90.
  - **LCP < 2.5 s, CLS < 0.1, INP < 200 ms.**
  - Public initial JS ≤ 120 KB gzip; CSS ≤ 30 KB gzip; preloaded fonts ≤ 2 files (~80 KB).
  - Hero LCP is text or the inline SVG (no network image).
  - **No third-party scripts by default.** Analytics is added only after decision D-033, deferred and consent-aware.

## 12. Admin UI
- **Same tokens and primitives, light theme, denser spacing** (body 14–15 px; tables 40 px rows).
- **Shell:** a 248 px `navy-950` sidebar (sections: Dashboard, Pages, Services, Portfolio, Testimonials, Careers, Media, Leads, Settings, SEO & Redirects, Administrators, Activity), a top bar (search, "View site", account menu), and a `neutral-50` canvas.
- **Editor layout:** form on the left (max 760 px). On the right, a sticky panel with status, revision, publish controls, placeholders checklist, SEO preview and "where used".
- **Status badges:** Draft (neutral) · Published (`success-700`) · Unpublished changes (`warning-700`) · Archived (neutral-dark) · Placeholders *n* (`danger-600`).
- **Destructive actions:** `danger` buttons, confirmation dialogs, and typed confirmation for permanent deletes.
- Must be fully usable on a tablet (≥ 768 px). On phones, at least the leads inbox and lead status updates must work.
