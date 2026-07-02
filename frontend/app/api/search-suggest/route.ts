import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createBuildClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 0;

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export interface SuggestItem {
  type: "sector" | "hashtag" | "article";
  label: string;
  url: string;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const supabase = createBuildClient();
  const normalized = normalizeTr(q);

  const filterExpr =
    normalized !== q.toLocaleLowerCase("tr-TR")
      ? `title_tr.ilike.%${q}%,title_tr.ilike.%${normalized}%`
      : `title_tr.ilike.%${q}%`;

  const [sectorsRes, hashtagsRes, articlesRes] = await Promise.all([
    supabase
      .from("sectors")
      .select("slug, name_tr")
      .or(`name_tr.ilike.%${q}%,slug.ilike.%${normalized}%`)
      .limit(2),

    supabase.rpc("search_hashtags", { q: normalized, lim: 3 }),

    supabase
      .from("articles")
      .select("title_tr, slug")
      .eq("is_suppressed", false)
      .gte("score", 5)
      .or(filterExpr)
      .order("score", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  const results: SuggestItem[] = [];

  for (const s of sectorsRes.data ?? []) {
    results.push({ type: "sector", label: s.name_tr, url: `/sektorler/${s.slug}` });
  }

  const seenHashtags = new Set<string>();
  for (const row of (hashtagsRes.data ?? []) as { tag: string }[]) {
    const tag = row.tag;
    if (!seenHashtags.has(tag)) {
      seenHashtags.add(tag);
      const displayLabel = tag.replace(/-/g, " ");
      results.push({ type: "hashtag", label: `#${displayLabel}`, url: `/hashtag/${tag}` });
    }
  }

  for (const a of articlesRes.data ?? []) {
    if (a.title_tr) {
      results.push({ type: "article", label: a.title_tr, url: `/haber/${a.slug}` });
    }
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
