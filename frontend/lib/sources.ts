/**
 * News sources, mirroring scraper/scraper/sources.py.
 *
 * Kept in sync by hand rather than generated: the scraper is Python, the Vercel
 * build root is the repo root, and a cross-language build step for 15 rows of
 * static data costs more than it saves. `scripts/check-sources.mjs` runs as part
 * of `prebuild` and fails the build if this file and the Python registry drift.
 *
 * `label` is the outlet name shown in the "Kaynak:" citation. `homepage` is what
 * that citation links to: brand attribution to the outlet's front page, not the
 * exact scraped article.
 */

export type SourceLang = "en" | "fr" | "pt";

export interface NewsSource {
  slug: string;
  label: string;
  homepage: string;
  lang: SourceLang;
}

export const SOURCES: NewsSource[] = [
  { slug: "the_conversation",     label: "The Conversation Africa",        homepage: "https://theconversation.com",         lang: "en" },
  { slug: "africa_report",        label: "The Africa Report",              homepage: "https://www.theafricareport.com",     lang: "en" },
  { slug: "cnbc_africa",          label: "CNBC Africa",                    homepage: "https://www.cnbcafrica.com",          lang: "en" },
  { slug: "aa_africa",            label: "Anadolu Ajansı",                 homepage: "https://www.aa.com.tr",               lang: "en" },
  { slug: "business_insider",     label: "Business Insider Africa",        homepage: "https://africa.businessinsider.com",  lang: "en" },
  { slug: "ecofin",               label: "Ecofin Agency",                  homepage: "https://www.ecofinagency.com",        lang: "en" },
  { slug: "business_daily_africa", label: "Business Daily Africa",         homepage: "https://www.businessdailyafrica.com", lang: "en" },
  { slug: "business_in_cameroon", label: "Business in Cameroon",           homepage: "https://www.businessincameroon.com",  lang: "en" },
  { slug: "medias24",             label: "Médias24",                       homepage: "https://medias24.com",                lang: "fr" },
  { slug: "nairametrics",         label: "Nairametrics",                   homepage: "https://nairametrics.com",            lang: "en" },
  { slug: "bft_online",           label: "The Business & Financial Times", homepage: "https://thebftonline.com",            lang: "en" },
  { slug: "daily_news_egypt",     label: "Daily News Egypt",               homepage: "https://www.dailynewsegypt.com",      lang: "en" },
  { slug: "capital_ethiopia",     label: "Capital Ethiopia",               homepage: "https://capitalethiopia.com",         lang: "en" },
  { slug: "new_times_rwanda",     label: "The New Times",                  homepage: "https://www.newtimes.co.rw",          lang: "en" },
  { slug: "mozambique_360",       label: "360 Mozambique",                 homepage: "https://360mozambique.com",           lang: "pt" },
];

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCES.map((s) => [s.slug, s.label]),
);

export const SOURCE_HOMEPAGES: Record<string, string> = Object.fromEntries(
  SOURCES.map((s) => [s.slug, s.homepage]),
);
