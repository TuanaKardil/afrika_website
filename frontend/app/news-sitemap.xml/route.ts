import { NextResponse } from "next/server";
import { createBuildClient } from "@/lib/supabase/server";
import { MIN_PUBLISHED_SCORE } from "@/lib/constants";

export const revalidate = 3600;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const supabase = createBuildClient();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title_tr, published_at")
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
    .gte("score", MIN_PUBLISHED_SCORE)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(1000);

  const items = (articles ?? [])
    .map(
      (a) => `  <url>
    <loc>https://www.afrikahaberleri.tr/haber/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Afrika Haberleri</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${a.published_at}</news:publication_date>
      <news:title>${escapeXml((a.title_tr ?? "").slice(0, 110))}</news:title>
    </news:news>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
