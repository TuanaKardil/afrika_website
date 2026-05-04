# Afrika Haberleri Design System

Turkish-language Africa news aggregator. Editorial visual direction inspired by CNBC Africa, Bloomberg, and Reuters. Target audience: Turkish business community interested in African markets — exporters, contractors, investors, defense and energy sectors.

## What this is

A standalone design system for `afrikahaberleri.com`. The codebase exists at https://github.com/TuanaKardil/afrika_website (Next.js 14 App Router + TypeScript strict + Tailwind), but the source repo still ships the old warm orange/cream palette. This system replaces it with the new navy/financial-news direction the brand has moved to.

## Sources consulted

- **Code:** TuanaKardil/afrika_website (frontend/, scraper/, supabase/) — read structurally for navigation, routes, components, but the warm-palette tokens have been deliberately discarded.
- **Visual reference:** CNBC Africa (cnbcafrica.com) is the primary 1:1 reference. Bloomberg and Reuters serve as supporting references for editorial density.
- **Brand brief:** the tokens, type rules, and layout principles in `colors_and_type.css` come from the user's brief, not the source repo.

## Audience and tone

Türk iş dünyası: ihracatçılar, müteahhitler, yatırımcılar; sektör odaklı (inşaat, enerji, savunma, madencilik, tekstil, otomotiv). Editöryal, ciddi, ulaşılabilir. Güven veren. The Economist + Monocle iddiası, CNBC Africa görsel dili.

## Index

| File / folder | What's in it |
|---|---|
| `colors_and_type.css` | All design tokens — colors, type ramp, spacing, radii — as CSS custom properties. Single source of truth. |
| `fonts/` | Inter variable fonts (woff2). |
| `assets/` | Logos, placeholder photography, country flags reference. |
| `preview/` | Design system cards rendered as small HTML files for the Design System review tab. |
| `ui_kits/website/` | Hi-fi recreation of the Next.js news site: header, sector ticker, hero grid, article cards, footer. Open `index.html` for the demo. |
| `SKILL.md` | Skill manifest — makes this folder usable as a Claude Code skill. |

## Critical rules

- **Em dashes (—) are forbidden** anywhere. Turkish copy and English copy alike. Use commas, semicolons, colons, parentheses.
- **All UI copy in Turkish.** Code, comments, file names, class names in English.
- **No serif type.** Inter only. (The old EB Garamond and Manrope pairing has been retired.)
- **Single accent.** The navy-and-amber pairing is the brand signature. Resist adding a third accent.
- **No hover scale.** Cards do not lift, scale, or grow on hover. They get an underlined headline. Period.

## Content fundamentals

**Voice.** Editöryal, üçüncü tekil. Haber dili, ne resmi tutanak ne sosyal medya. Bloomberg/Reuters tonu Türkçeye çevrilmiş hali.

- Person: third-person, news register. No "biz", no "siz". Headlines are declarative, not questions.
- Casing: Turkish sentence case for headlines (`Senegal'de yeni petrol sahası keşfedildi`), uppercase only for tiny labels (categories, timestamps, badges).
- Numerals: Turkish formatting — `1.250.000 TL`, `%4,2`, `2026'nın ilk çeyreği`. Currency symbol after value where natural (`850 milyon dolar`), not before.
- Punctuation: NO em dash. Use comma or semicolon. Quotation marks: `«»` or `""` consistently per piece.
- Emoji: never in editorial content. Never in chrome.
- Date/time: `29 Nisan 2026, 14:30` long form. Short form on cards: `29 NİSAN 2026` or relative (`2 SAAT ÖNCE`) — always uppercase, gray, with a small amber dot prefix.

**Headline patterns.**
- Subject-first, verb-strong: `Türk müteahhitler Cezayir'de 1,2 milyar dolarlık ihaleyi kazandı`
- Place-led when geography matters: `Senegal: Yeni LNG sahası keşfi enerji ihracatını yeniden şekillendirebilir`
- Sector tags as colon-prefixed contexts: `Savunma sanayi: Aselsan'ın Mısır anlaşması nihai onay aşamasında`
- No clickbait. No "şok eden". No "işte o detaylar". No "mutlaka okuyun".

**Section labels.**
`SEKTÖRLER`, `ÜLKELER`, `SON HABERLER`, `EN ÇOK OKUNANLAR`, `FIRSATLAR`. Always uppercase, 600 weight, tracking-wider, navy or gray.

**Categories shown as breadcrumbs/chips.** Never decorative. Always navigable.

## Visual foundations

**Palette.** A two-pole system: navy (`#0a2351`) anchors chrome, amber (`#f5b800`) marks time and live signals. White body. Editorial blue (`#1e6fb8`) is the only link/accent rule color. Semantic green/red strictly for market data.

**Backgrounds.** White body. Navy header and footer only. No gradients ever. No textures, no patterns, no grain. Imagery is the only color in the page besides headers.

**Imagery.** Photojournalism: documentary, full-color, neutral. No filters, no duotone, no warm grading. Hero photos are full-bleed inside their card with a deep navy-tinted darkening overlay (linear-gradient bottom-up from `rgba(10,35,81,0.85)` to transparent at 40%) so white headline copy reads cleanly. No drop shadows on photos.

**Type.** Inter, single family, weights 400 / 600 / 700 / 800. Tracking tight on display sizes, tracking-wider on uppercase micro-labels. No italic for emphasis (use bold). Numerals: tabular for tables and tickers (`font-feature-settings: "tnum"`).

**Spacing.** 4px base. The grid is 8 / 12 / 16 / 24 / 32 / 48 / 64 — not generous. Editorial density is the goal.

**Radii.** `2px` (`rounded-sm`) is the default for cards, badges, search input. `9999px` only for status dots and the live indicator. Nothing in between. No `rounded-xl`, no `rounded-2xl`. Sharp corners are the brand.

**Borders.** `1px solid #e5e7eb` for card and divider rules. `2px solid #1e6fb8` underline above section titles. `3px solid #f5b800` for the "live now" marker if used.

**Shadows.** None on cards. None on photos. Only used for the dropdown menu (`0 4px 16px rgba(10,35,81,0.10)`) and modal/search overlays.

**Hover states.**
- Links and headlines: underline appears (text-decoration: underline; text-underline-offset: 3px; decoration-color: currentColor; decoration-thickness: 1px). Color does not change.
- Nav items: amber 2px underline animates in from below.
- Buttons: background darkens 6%. No scale.
- Cards: headline gets an underline. The card itself does not move, scale, lift, or shadow.

**Press / active.** Background darkens 12%. No scale.

**Focus.** 2px outline `#1e6fb8` with 2px offset. Always visible — keyboard-first.

**Transitions.** 120ms `ease-out` for color/border. Nothing animates more than that. No bounces, no springs. Page transitions are instant.

**Transparency / blur.** Used in exactly one place: the dark photo overlay. Otherwise solid colors only.

**Layout rules.**
- Sticky navy header (56px tall on desktop, 48px on mobile) — logo left, search right.
- Below header: thin horizontal nav bar (8 top tabs), 40px tall, white background, 1px bottom border.
- Below nav: sector ticker — horizontally scrollable chip row, 36px tall, surface-container background.
- Hero zone: 3-column grid on desktop (8/4/3 col-spans on a 12-col grid roughly translates to `grid-cols-[2fr_1fr_1fr]` — large lead, two secondary, sidebar list).
- Section title pattern: 2px navy rule above + 12px gap + uppercase navy label, 14px, 700.
- Information density: cards 4 per row on desktop within sections; never fewer than 3.

**Iconography.** See `assets/README.md` and the dedicated section below.

## Iconography

The source repo uses inline SVG line icons drawn ad hoc (search magnifier, hamburger). For this system we standardize on **Lucide** at 1.5px stroke, sized 16/18/20px. Reasoning: matches CNBC Africa's icon style closely, MIT licensed, available via CDN, complete coverage.

- Default: 18px, 1.5px stroke, `currentColor`.
- In navy header: white.
- In editorial content: navy `#0a2351` or gray `#6b7280`.
- Status dots (live, breaking) are CSS circles, not icons.
- Country flags: ISO 3166 region rendered as `<img>` from a flag CDN (16×12px). Listed in `assets/flags-reference.md`.
- Logos: brand wordmark in `assets/logo-*.svg`. Two lockups: navy-on-white and white-on-navy.
- No emoji anywhere. No unicode glyph icons (`▶ ★ ✓` etc).
- No custom-drawn illustration. If a piece needs an illustrative element, use photography or a placeholder card with the wordmark.

## Substitutions flagged

- **Inter** is loaded from Google Fonts (variable woff2) as the closest open-source match to the brief. The brief permitted "Inter veya IBM Plex Sans" — we picked Inter for tighter editorial counters at display sizes. **If you want IBM Plex Sans instead, swap the @font-face block in `colors_and_type.css` and the `--font-family-sans` value.**
- **No real photography** is included. Hero and card images use a subtle navy-tinted placeholder block. Replace with actual editorial photography before launch.
- **Logo**: the source repo has no logo file. We generated a wordmark in `assets/logo-*.svg`. **Please review or supply the official wordmark.**
