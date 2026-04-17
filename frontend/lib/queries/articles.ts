import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Article = Database["public"]["Tables"]["articles"]["Row"];

export const PAGE_SIZE = 12;

export async function getLatestArticles(
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getFeaturedArticle(): Promise<Article | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("is_featured", true)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fall back to the most recent translated article if none is marked featured
  if (!data) {
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
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

export async function getArticlesByCategory(
  categorySlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("category_slug", categorySlug)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getArticlesByRegion(
  regionSlug: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("region_slug", regionSlug)
    .not("title_tr", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  return { articles: data ?? [], count: count ?? 0 };
}

export async function getAllSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .order("published_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => (r as Article).slug);
}
