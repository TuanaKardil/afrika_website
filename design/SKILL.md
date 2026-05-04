---
name: afrika-haberleri-design
description: Use this skill to generate well-branded interfaces and assets for Afrika Haberleri (afrikahaberleri.com), a Turkish-language Africa news aggregator targeting the Turkish business community. The visual direction is editorial financial-news (CNBC Africa, Bloomberg, Reuters), built on a navy + amber palette with Inter type. Use for production code or throwaway prototypes/mocks.
user-invocable: true
---

Read `README.md` first for the full visual and content brief, then explore:

- `colors_and_type.css` for tokens (single source of truth)
- `assets/` for logos and the iconography reference
- `ui_kits/website/` for hi-fi React component recreations and a working homepage demo

Critical rules to enforce in every output:
- No em dashes (—) anywhere, in any language
- All UI copy in Turkish; code/comments in English
- Inter only (no serif, no Manrope, no EB Garamond)
- Navy `#0a2351` for chrome, amber `#f5b800` for time/live, blue `#1e6fb8` for links/section rules
- Sharp `2px` corners; no rounded `xl`/`2xl`
- No hover scale, no card lift; hover = headline underline only
- Amber dot precedes every timestamp; categories always uppercase 600 weight tracking-wider
- Section eyebrows always preceded by 2px navy/blue rule

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out of this folder and produce static HTML. If working on production code, copy assets and read the rules to act as an expert designer.

If invoked without guidance, ask the user what they want to build, then act as an expert designer and output HTML or production code as appropriate.
