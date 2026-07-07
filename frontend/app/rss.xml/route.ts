import { NextResponse } from "next/server";
import { createBuildClient } from "@/lib/supabase/server";
import { MIN_PUBLISHED_SCORE } from "@/lib/constants";

export const revalidate = 1800;

const SITE_URL = "https://www.afrikahaberleri.tr";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(dateIso: string): string {
  return new Date(dateIso).toUTCString();
}

export async function GET() {
  const supabase = createBuildClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title_tr, meta_description_tr, excerpt_tr, featured_image_url, published_at")
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
    .gte("score", MIN_PUBLISHED_SCORE)
    .order("published_at", { ascending: false })
    .limit(50);

  const lastBuildDate = articles?.[0]?.published_at
    ? rfc822(articles[0].published_at)
    : new Date().toUTCString();

  const items = (articles ?? [])
    .map((a) => {
      const link = `${SITE_URL}/haber/${a.slug}`;
      const description = a.meta_description_tr ?? a.excerpt_tr ?? "";
      const image = a.featured_image_url
        ? `\n      <media:content url="${escapeXml(a.featured_image_url)}" medium="image" />`
        : "";
      return `    <item>
      <title>${escapeXml(a.title_tr ?? "")}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(a.published_at)}</pubDate>
      <description>${escapeXml(description)}</description>${image}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Afrika Haberleri</title>
    <link>${SITE_URL}</link>
    <description>Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için seçilmiş güncel haberlerle takip edin.</description>
    <language>tr</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/icon.png</url>
      <title>Afrika Haberleri</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
