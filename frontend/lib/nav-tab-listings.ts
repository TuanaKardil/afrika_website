/**
 * Config for the nav-tab listing routes.
 *
 * These six pages were byte-identical apart from their strings, and each now
 * needs a twin under /sayfa/[n], so the shape lives here once and both routes
 * read from it. Adding a tab means one entry plus two thin page files.
 *
 * `title`, `heading` and `crumb` are separate on purpose: turk-is-dunyasi ships
 * a longer <h1> and <title> than its breadcrumb label, and these strings are
 * live SEO copy, so they are carried over verbatim.
 */
export interface NavTabListing {
  navTab: string;
  /** <title> and og:title base, before titleWithPage() appends the page number. */
  title: string;
  description: string;
  /** <h1> on the page. */
  heading: string;
  /** Breadcrumb label. */
  crumb: string;
  basePath: string;
}

export const NAV_TAB_LISTINGS = {
  firsatlar: {
    navTab: "firsatlar",
    title: "Fırsatlar",
    description: "Afrika'dan yatırım fırsatları ve proje haberleri.",
    heading: "Fırsatlar",
    crumb: "Fırsatlar",
    basePath: "/firsatlar",
  },
  "pazarlar-ekonomi": {
    navTab: "pazarlar-ekonomi",
    title: "Pazarlar & Ekonomi",
    description: "Afrika piyasaları ve ekonomi haberleri.",
    heading: "Pazarlar & Ekonomi",
    crumb: "Pazarlar & Ekonomi",
    basePath: "/pazarlar-ekonomi",
  },
  "ticaret-ihracat": {
    navTab: "ticaret-ihracat",
    title: "Ticaret & İhracat",
    description: "Afrika ile ticaret ve ihracat haberleri.",
    heading: "Ticaret & İhracat",
    crumb: "Ticaret & İhracat",
    basePath: "/ticaret-ihracat",
  },
  diger: {
    navTab: "diger",
    title: "Diğer",
    description: "Diğer Afrika haberleri.",
    heading: "Diğer",
    crumb: "Diğer",
    basePath: "/diger",
  },
  "turk-is-dunyasi": {
    navTab: "turk-is-dunyasi",
    title: "Türk İş Dünyası Afrika'da",
    description: "Afrika'daki Türk şirketleri ve iş insanları haberleri.",
    heading: "Türk İş Dünyası Afrika'da",
    crumb: "Türk İş Dünyası",
    basePath: "/turk-is-dunyasi",
  },
  "etkinlikler-fuarlar": {
    navTab: "etkinlikler-fuarlar",
    title: "Etkinlikler & Fuarlar",
    description: "Afrika iş fuarları ve etkinlik haberleri.",
    heading: "Etkinlikler & Fuarlar",
    crumb: "Etkinlikler & Fuarlar",
    basePath: "/etkinlikler-fuarlar",
  },
} as const satisfies Record<string, NavTabListing>;

export type NavTabKey = keyof typeof NAV_TAB_LISTINGS;
