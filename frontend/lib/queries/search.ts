import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Article } from "./articles";

export const SEARCH_PAGE_SIZE = 12;

export async function searchArticles(
  query: string,
  page = 1
): Promise<{ articles: Article[]; count: number }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { articles: [], count: 0 };

  const supabase = createClient();
  const offset = (page - 1) * SEARCH_PAGE_SIZE;

  // Use the search_articles RPC (full-text over title + body with ranking)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error } = await (supabase.rpc as any)(
    "search_articles",
    { query: trimmed, lim: SEARCH_PAGE_SIZE, off: offset }
  );

  if (error) {
    console.error("search_articles RPC error:", error);
    return { articles: [], count: 0 };
  }

  // Separate count query for pagination (textSearch on title_tr, uses GIN index)
  const { count } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .not("title_tr", "is", null)
    .textSearch("title_tr", trimmed);

  return {
    articles: (rpcData as Article[]) ?? [],
    count: count ?? (rpcData as Article[])?.length ?? 0,
  };
}
