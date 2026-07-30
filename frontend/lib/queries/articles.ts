import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";
import { MIN_PUBLISHED_SCORE } from "@/lib/constants";
import { DELETED_HABER_SLUGS } from "@/lib/deleted-slugs";

export type Article = Database["public"]["Tables"]["articles"]["Row"];

export const PAGE_SIZE = 12;

export const COUNTRY_SLUG_TO_HASHTAG: Record<string, string> = {
  "angola":                   "Angola",
  "benin":                    "Benin",
  "botsvana":                 "Botsvana",
  "burkina-faso":             "Burkina Faso",
  "burundi":                  "Burundi",
  "cezayir":                  "Cezayir",
  "cibuti":                   "Cibuti",
  "cad":                      "Çad",
  "demokratik-kongo":         "DR Kongo",
  "ekvator-ginesi":           "Ekvator Ginesi",
  "eritre":                   "Eritre",
  "eswatini":                 "Esvatini",
  "etiyopya":                 "Etiyopya",
  "fas":                      "Fas",
  "fildisi-sahili":           "Fildişi Sahili",
  "gabon":                    "Gabon",
  "gambiya":                  "Gambiya",
  "gana":                     "Gana",
  "gine":                     "Gine",
  "gine-bissau":              "Gine-Bissau",
  "guney-afrika":             "Güney Afrika Cumhuriyeti",
  "guney-sudan":              "Güney Sudan",
  "kamerun":                  "Kamerun",
  "kenya":                    "Kenya",
  "komorlar":                 "Komorlar",
  "kongo-cumhuriyeti":        "Kongo Cumhuriyeti",
  "lesoto":                   "Lesoto",
  "liberya":                  "Liberya",
  "libya":                    "Libya",
  "madagaskar":               "Madagaskar",
  "malavi":                   "Malavi",
  "mali":                     "Mali",
  "mauritius":                "Mauritius",
  "misir":                    "Mısır",
  "moritanya":                "Moritanya",
  "mozambik":                 "Mozambik",
  "namibya":                  "Namibya",
  "nijer":                    "Nijer",
  "nijerya":                  "Nijerya",
  "orta-afrika-cumhuriyeti":  "Orta Afrika Cumhuriyeti",
  "ruanda":                   "Ruanda",
  "sao-tome-ve-principe":     "Sao Tome ve Principe",
  "senegal":                  "Senegal",
  "seyseller":                "Seyşeller",
  "sierra-leone":             "Sierra Leone",
  "somali":                   "Somali",
  "sudan":                    "Sudan",
  "tanzanya":                 "Tanzanya",
  "togo":                     "Togo",
  "tunus":                    "Tunus",
  "uganda":                   "Uganda",
  "yesil-burun-adalari":      "Yeşil Burun Adaları",
  "zambiya":                  "Zambiya",
  "zimbabve":                 "Zimbabve",
};

export async function getLatestArticles(
  page = 1,
  excludeIds: string[] = []
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, count } = await query;

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getTopScoredRecent(limit = 3): Promise<Article[]> {
  const supabase = createClient();
  // Try last 48h first, fall back to all-time if not enough results
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .gte("published_at", since48h)
    .order("score", { ascending: false })
    .limit(limit);
  if ((data ?? []).length >= limit) return data!;
  // Fallback: most recent high-scored articles regardless of date
  const { data: fallback } = await supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  return fallback ?? [];
}

export async function getFeaturedArticle(): Promise<Article | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .eq("is_featured", true)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .eq("is_suppressed", false)
      .gte("score", MIN_PUBLISHED_SCORE)
      .not("title_tr", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return fallback;
  }

  return data;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

// Article URLs must never die. A scraper bug (fixed in pipelines.py: "slug" is
// now excluded from the is_update write) re-computed the slug on every content
// re-scrape, flipping published URLs between "<base>" and "<base>-<6 hex>";
// every flip left the previous URL dead. See CLAUDE.md rule 22.
//
// Given a slug that no longer resolves, find the article it belongs to so the
// page can 308 instead of 404. Three strategies, most authoritative first.
const SLUG_HASH_SUFFIX = /-[0-9a-f]{6}$/;

/**
 * Match _make_slug()'s output charset: strip accents, keep [a-z0-9-].
 *
 * The route segment can still be percent-encoded here, so decode first:
 * without it "k%C3%A2ri" would collapse to "kc3a2ri" instead of "kari".
 */
function asciiSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Malformed escape sequence: fall through with the raw value.
  }
  return decoded
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

export async function resolveLegacyArticleSlug(slug: string): Promise<string | null> {
  const supabase = createClient();

  // 1. Authoritative: the DB records every slug a row has ever had
  //    (article_slug_history + trigger, migration 032). This survives any
  //    slug move, including a deliberate one made in the Supabase dashboard.
  //    Tolerate the table not existing yet so the fallbacks still work.
  //    The route segment arrives percent-encoded, so a retired slug carrying a
  //    non-ASCII char ("...omnianin-kâri...") is stored decoded but looked up
  //    as "k%C3%A2ri" and would never match. Try both spellings.
  const historyKeys = [slug];
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) historyKeys.push(decoded);
  } catch {
    // Malformed escape sequence: the raw value is all we have.
  }

  const { data: history } = await supabase
    .from("article_slug_history")
    .select("article_id")
    .in("old_slug", historyKeys)
    .limit(1)
    .maybeSingle();

  if (history?.article_id) {
    const { data: target } = await supabase
      .from("articles")
      .select("slug")
      .eq("id", history.article_id)
      .eq("is_suppressed", false)
      .gte("score", MIN_PUBLISHED_SCORE)
      .not("title_tr", "is", null)
      .maybeSingle();
    if (target?.slug && target.slug !== slug) return target.slug;
  }

  // 2 + 3. Heuristic for slugs that moved before the history table existed.
  //    The title (and therefore the slug base) is frozen on the update path,
  //    so every historical slug of an article is "<base>" or "<base>-<6 hex>".
  //    Also try the ASCII form: a legacy backfill stored a few slugs with an
  //    accented char ("kâri"), which no request can ever match.
  const candidates = [slug, asciiSlug(slug)]
    .map((s) => s.replace(SLUG_HASH_SUFFIX, ""))
    .filter((s, i, a) => s.length >= 8 && a.indexOf(s) === i);

  for (const base of candidates) {
    const { data } = await supabase
      .from("articles")
      .select("slug")
      // "______" is six single-char wildcards, so this matches exactly
      // "<base>-<6 chars>" and never a longer, unrelated slug that merely
      // starts with base (e.g. "gana-kakao" vs "gana-kakao-fiyatlari-artti").
      .or(`slug.eq.${base},slug.like.${base}-______`)
      .eq("is_suppressed", false)
      .gte("score", MIN_PUBLISHED_SCORE)
      .not("title_tr", "is", null)
      .order("published_at", { ascending: false })
      .limit(1);

    const found = data?.[0]?.slug ?? null;
    if (found && found !== slug) return found;
  }

  return null;
}

export async function getArticlesByNavTab(
  navTabSlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .eq("nav_tab_slug", navTabSlug)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesBySector(
  sectorSlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (sectorSlug === "diger-sektor") {
    // Include articles explicitly tagged diger-sektor OR in sektorler nav with no sector
    query = query.or(
      "sector_slugs.cs.{diger-sektor},and(nav_tab_slug.eq.sektorler,sector_slugs.eq.{})"
    );
  } else {
    query = query.contains("sector_slugs", [sectorSlug]);
  }

  const { data, count } = await query;
  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesByRegion(
  regionSlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (regionSlug !== "afrika") {
    query = query.eq("region_slug", regionSlug);
  }

  const { data, count } = await query;

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesByCountry(
  hashtagName: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;
  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .contains("hashtags", [hashtagName])
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  return { articles: data ?? [], count: count ?? 0 };
}

export async function getTopArticles(limit = 5): Promise<Article[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(limit);
  return data ?? [];
}

export async function getFilteredArticles(
  page = 1,
  regionSlug: string | null = null,
  navTabSlug: string | null = null
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (regionSlug && regionSlug !== "afrika") {
    query = query.eq("region_slug", regionSlug);
  }

  if (navTabSlug) {
    query = query.eq("nav_tab_slug", navTabSlug);
  }

  const { data, count } = await query;
  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesByHashtag(
  tag: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .contains("hashtags", [tag])
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesByAuthor(
  authorSlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .eq("author_slug", authorSlug)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getSimilarArticles(
  articleId: string,
  navTabSlug: string | null,
  sectorSlugs: string[],
  hashtags: string[],
  limit = 5
): Promise<Article[]> {
  const supabase = createClient();

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Candidate pool: same nav_tab OR overlapping sectors, last 60 days, max 50
  const filters: string[] = [];
  if (navTabSlug) filters.push(`nav_tab_slug.eq.${navTabSlug}`);
  if (sectorSlugs.length > 0) {
    filters.push(`sector_slugs.ov.{${sectorSlugs.join(",")}}`);
  }

  let query = supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .neq("id", articleId)
    .gte("published_at", sixtyDaysAgo.toISOString())
    .order("published_at", { ascending: false })
    .limit(50);

  if (filters.length > 0) {
    query = query.or(filters.join(","));
  }

  const { data } = await query;
  const candidates = data ?? [];

  // Score each candidate
  const hashtagSet = new Set(hashtags);
  const sectorSet = new Set(sectorSlugs);

  const scored = candidates
    .map((c) => {
      let score = 0;
      for (const tag of c.hashtags ?? []) {
        if (hashtagSet.has(tag)) score += 2;
      }
      for (const s of c.sector_slugs ?? []) {
        if (sectorSet.has(s)) score += 3;
      }
      if (navTabSlug && c.nav_tab_slug === navTabSlug) score += 1;
      return { article: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : new Date(b.article.published_at).getTime() -
          new Date(a.article.published_at).getTime()
    );

  return scored.slice(0, limit).map((x) => x.article);
}

/**
 * The next (older) published article, for the "Sonraki Haber" card.
 *
 * Keyset on the (published_at, id) pair rather than OFFSET or a bare
 * `.lt("published_at", ...)`: published_at is NOT unique here, one scrape batch
 * routinely writes several rows carrying the same source timestamp, and a strict
 * less-than would silently skip every one of those ties. So a small window is
 * fetched in the same total order the listings use, the current article is
 * located in it, and the next survivor is taken.
 *
 * Returns null on the oldest article, and the card then renders nothing.
 */
const NEXT_ARTICLE_WINDOW = 8; // covers timestamp ties plus a few skipped slugs

export async function getNextArticle(article: Article): Promise<Article | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .lte("published_at", article.published_at)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NEXT_ARTICLE_WINDOW);

  const rows = data ?? [];
  const here = rows.findIndex((r) => r.id === article.id);
  const after = here >= 0 ? rows.slice(here + 1) : rows.filter((r) => r.id !== article.id);

  // Never link to a slug middleware answers with 410: that branch only matches
  // paths starting with "/haber/", so it cannot protect a query result.
  return after.find((r) => !DELETED_HABER_SLUGS.has(r.slug)) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .order("published_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => (r as Article).slug);
}
