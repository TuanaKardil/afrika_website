import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";

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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
      .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
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
    .gte("score", 5)
    .not("title_tr", "is", null)
    .contains("hashtags", [tag])
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getAllSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .eq("is_suppressed", false)
    .gte("score", 5)
    .order("published_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => (r as Article).slug);
}
