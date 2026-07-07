import type { Metadata } from "next";

type CanonicalParams = Record<string, string | null | undefined>;

const SITE_URL = "https://www.afrikahaberleri.tr";

// Fixed order keeps canonical URLs stable regardless of incoming param order.
const PARAM_ORDER = ["ulke", "bolge", "kategori", "sayfa"] as const;

export function parsePageParam(sayfa?: string): number {
  return Math.max(1, Number(sayfa ?? 1) || 1);
}

/**
 * Builds an absolute canonical URL. Relative paths are avoided because Next's
 * metadata resolver drops the query string when resolving "/?x=y" against
 * metadataBase. Only whitelisted params are kept; sayfa=1 is normalized to
 * the clean URL.
 */
export function buildCanonical(path: string, params: CanonicalParams = {}): string {
  const search = new URLSearchParams();
  for (const key of PARAM_ORDER) {
    const value = params[key];
    if (!value) continue;
    if (key === "sayfa" && value === "1") continue;
    search.set(key, value);
  }
  const qs = search.toString();
  const cleanPath = path === "/" ? "" : path;
  return qs ? `${SITE_URL}${cleanPath}?${qs}` : `${SITE_URL}${cleanPath || "/"}`;
}

export function titleWithPage(title: string, page: number): string {
  return page > 1 ? `${title} | Sayfa ${page}` : title;
}

/**
 * Canonical + matching og:url in one shot for standard "website" pages.
 *
 * Child openGraph replaces the root layout's wholesale in Next, so a page that
 * only wants a correct og:url must still restate type/siteName/locale here.
 * Without this, listing/static pages inherit the root `url: "/"` and every one
 * of them reports og:url as the homepage. Images are intentionally omitted so
 * the file-convention `app/opengraph-image.png` fallback still applies. Do NOT
 * use this on pages that need a richer OG object (articles/blog set their own).
 */
export function pageOpenGraph(url: string): Metadata["openGraph"] {
  return {
    type: "website",
    siteName: "Afrika Haberleri",
    locale: "tr_TR",
    url,
  };
}

export function canonicalMeta(
  path: string,
  params: CanonicalParams = {}
): Pick<Metadata, "alternates" | "openGraph"> {
  const canonical = buildCanonical(path, params);
  return { alternates: { canonical }, openGraph: pageOpenGraph(canonical) };
}

const MODIFIED_EPSILON_MS = 10 * 60 * 1000;

/**
 * Resolves the real modification date of an article. updated_at equals
 * scraped_at at insert time and is only bumped by genuine re-writes (the
 * scraper's is_update path, admin content edits), so it counts as a
 * modification only when it is meaningfully later than scraped_at.
 * Never fake-freshen dates: fall back to published_at otherwise.
 */
export function resolveModifiedDate(
  publishedAt: string,
  updatedAt: string | null,
  scrapedAt: string | null
): { dateModified: string; isUpdated: boolean } {
  if (updatedAt && scrapedAt) {
    const diff = new Date(updatedAt).getTime() - new Date(scrapedAt).getTime();
    if (diff > MODIFIED_EPSILON_MS) return { dateModified: updatedAt, isUpdated: true };
  }
  return { dateModified: publishedAt, isUpdated: false };
}
