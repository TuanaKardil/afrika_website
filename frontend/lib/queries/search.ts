import { createBuildClient as createClient } from "@/lib/supabase/server";
import type { Article } from "./articles";
import { buildTsQuery } from "@/lib/search_synonyms";

export const SEARCH_PAGE_SIZE = 12;

export interface SearchFilters {
  navTab?: string | null;
  /** One of: "1d" | "7d" | "30d" — undefined means all time */
  dateRange?: string | null;
}

function dateRangeToTimestamp(range: string | null | undefined): string | null {
  if (!range) return null;
  const now = new Date();
  const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : null;
  if (!days) return null;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return from.toISOString();
}

export async function searchArticles(
  query: string,
  page = 1,
  filters: SearchFilters = {}
): Promise<{ articles: Article[]; count: number }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { articles: [], count: 0 };

  const supabase = createClient();
  const offset = (page - 1) * SEARCH_PAGE_SIZE;

  // Build synonym-expanded tsquery
  const tsqString = buildTsQuery(trimmed);
  if (!tsqString) return { articles: [], count: 0 };

  const filterNav = filters.navTab ?? null;
  const filterFrom = dateRangeToTimestamp(filters.dateRange);

  // Main search
  const { data, error } = await (supabase.rpc as any)("search_articles_v2", {
    raw_query:   trimmed,
    tsq_string:  tsqString,
    filter_nav:  filterNav,
    filter_from: filterFrom,
    lim:         SEARCH_PAGE_SIZE,
    off:         offset,
  });

  if (error) {
    console.error("search_articles_v2 error:", error);
    return { articles: [], count: 0 };
  }

  // Count (separate RPC to support pagination)
  const { data: countData, error: countError } = await (supabase.rpc as any)(
    "count_search_articles_v2",
    {
      raw_query:   trimmed,
      tsq_string:  tsqString,
      filter_nav:  filterNav,
      filter_from: filterFrom,
    }
  );

  if (countError) {
    console.error("count_search_articles_v2 error:", countError);
  }

  return {
    articles: (data as Article[]) ?? [],
    count: Number(countData ?? (data as Article[])?.length ?? 0),
  };
}
