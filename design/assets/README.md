# Brand Assets

## Logos

- `logo-navy.svg` — primary horizontal lockup, navy on white. Use on white/light backgrounds.
- `logo-white.svg` — inverse lockup, for navy header/footer/dark backgrounds.
- `logo-mark.svg` — square monogram (AH), for favicons and avatars.

The amber bar is the only graphic device — keep it. Minimum width: 160px for the wordmark, 24px for the mark. Clear space: equal to the cap-height of "A" on all sides.

> **Flag for review:** these wordmarks were generated for this design system because the source repo had no logo asset. Replace with the official wordmark when available.

## Photography

No real photography is bundled. Hero/card image slots use a CSS-tinted placeholder block. Drop real editorial photos into `photos/` and update card components to point at them.

Photography direction: documentary, full color, neutral grading. Subject-led. No staged stock. Wide aspect (16:9) for hero, 3:2 or 4:3 for card thumbnails.

## Country flags

Use a flag CDN at runtime — see `flags-reference.md` for the list of African ISO-3166 country codes the editorial covers.

## Iconography

Lucide icons via CDN. 1.5px stroke, 18px default. White in navy chrome, navy or gray in editorial content. No emoji, no unicode glyph icons.
