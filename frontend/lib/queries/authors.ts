import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";
import { MIN_PUBLISHED_SCORE } from "@/lib/constants";

export type Author = Database["public"]["Tables"]["authors"]["Row"];

export async function getAuthors(): Promise<Author[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export interface AuthorHeadline {
  slug: string;
  title_tr: string;
  published_at: string;
}

/**
 * Latest headlines per author for the /yazarlar index.
 *
 * One query, grouped in memory: the index shows every author, so N per-author
 * queries would mean 7 round trips on a page that renders in a single pass.
 * The window is generous enough that a low-volume desk (Orta Afrika) still
 * fills its card while the busiest desk cannot crowd the others out.
 */
export async function getHeadlinesByAuthor(
  perAuthor = 3
): Promise<Record<string, AuthorHeadline[]>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, title_tr, published_at, author_slug")
    .eq("is_suppressed", false)
    .gte("score", MIN_PUBLISHED_SCORE)
    .not("title_tr", "is", null)
    .not("author_slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(400);

  const grouped: Record<string, AuthorHeadline[]> = {};
  for (const row of data ?? []) {
    const key = row.author_slug as string;
    const bucket = (grouped[key] ??= []);
    if (bucket.length < perAuthor) {
      bucket.push({
        slug: row.slug,
        title_tr: row.title_tr as string,
        published_at: row.published_at,
      });
    }
  }
  return grouped;
}
