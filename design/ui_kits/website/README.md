# Afrika Haberleri — Website UI Kit

Hi-fi recreation of the news site homepage. Open `index.html` for the interactive demo.

## Components

| File | What it is |
|---|---|
| `Header.jsx` | Sticky navy header: logo, search input, account icons. |
| `Nav.jsx` | Horizontal 8-tab nav with hover dropdown for Sektörler. |
| `SectorTicker.jsx` | CNBC-style horizontal sector strip with up/down indicators. |
| `Hero.jsx` | 3-column hero grid: lead photo card, two secondary cards, "Son Haberler" sidebar. |
| `SectionBlock.jsx` | Reusable section with 2px blue rule + uppercase eyebrow + grid of cards. |
| `ArticleCard.jsx` | Standard card: image + amber-dot meta + bold headline + excerpt. |
| `RankedList.jsx` | "En Çok Okunanlar" ranked list with amber numbering. |
| `Footer.jsx` | Navy footer with category, region, corporate columns. |
| `data.js` | Sample article data, sectors, regions. All Turkish copy. |

## Demo flows

The `index.html` demo is static but shows:
- Sticky header that stays at top while scrolling
- Sektörler hover dropdown (hover the Sektörler tab)
- Horizontally scrolling sector ticker
- 3-column hero with photo overlay
- Sector and region section blocks
- Ranked "En Çok Okunanlar"

## Design rules followed

- No em dashes anywhere
- Sharp 2px corners, no rounded cards
- Amber dot precedes every timestamp
- Section eyebrow always preceded by 2px blue rule
- Hover: headline underline only; no scale, no shadow
- All copy in Turkish
