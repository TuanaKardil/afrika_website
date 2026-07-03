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
