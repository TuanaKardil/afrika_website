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

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const supabase = createBuildClient();
  const normalized = normalizeTr(q);

  // Search both raw input and ASCII-normalized form so "mis" matches "Mısır"
  const filterExpr =
    normalized !== q.toLocaleLowerCase("tr-TR")
      ? `title_tr.ilike.%${q}%,title_tr.ilike.%${normalized}%`
      : `title_tr.ilike.%${q}%`;

  const { data } = await supabase
    .from("articles")
    .select("title_tr, slug, nav_tab_slug, sector_slugs, hashtags")
    .eq("is_suppressed", false)
    .gte("score", 5)
    .or(filterExpr)
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(6);

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "no-store" },
  });
}
