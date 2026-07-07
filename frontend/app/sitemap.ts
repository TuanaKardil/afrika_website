import type { MetadataRoute } from "next";
import { createBuildClient } from "@/lib/supabase/server";
import { getRegions } from "@/lib/queries/regions";
import { getSectors } from "@/lib/queries/sectors";
import { MIN_PUBLISHED_SCORE } from "@/lib/constants";

const BASE_URL = "https://www.afrikahaberleri.tr";

// Hashtag pages below this article count are thin aggregations — excluded from
// the sitemap to avoid promoting low-value pages (they stay crawlable via links).
const HASHTAG_SITEMAP_MIN_ARTICLES = 3;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, priority: 1.0, changeFrequency: "hourly" },
  { url: `${BASE_URL}/haberler`, priority: 0.8, changeFrequency: "hourly" },
  { url: `${BASE_URL}/firsatlar`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/pazarlar-ekonomi`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/ticaret-ihracat`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/sektorler`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/etkinlikler-fuarlar`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/ulkeler`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/blog`, priority: 0.6, changeFrequency: "weekly" },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createBuildClient();

  const [{ data: articles }, { data: blogPosts }, regions, sectors] = await Promise.all([
    supabase
      .from("articles")
      .select("slug, updated_at, hashtags")
      .eq("is_suppressed", false)
      .not("title_tr", "is", null)
      .gte("score", MIN_PUBLISHED_SCORE),
    supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published"),
    getRegions(),
    getSectors(),
  ]);

  const articleEntries: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE_URL}/haber/${a.slug}`,
    lastModified: a.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const regionEntries: MetadataRoute.Sitemap = regions.map((r) => ({
    url: `${BASE_URL}/bolge/${r.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const sectorEntries: MetadataRoute.Sitemap = sectors.map((s) => ({
    url: `${BASE_URL}/sektorler/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const blogEntries: MetadataRoute.Sitemap = (blogPosts ?? []).map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ?? p.published_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Count articles per hashtag; only pages with enough content earn a slot.
  const tagCounts = new Map<string, number>();
  for (const a of articles ?? []) {
    for (const tag of a.hashtags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const hashtagEntries: MetadataRoute.Sitemap = Array.from(tagCounts.entries())
    .filter(([, n]) => n >= HASHTAG_SITEMAP_MIN_ARTICLES)
    .map(([tag]) => ({
      url: `${BASE_URL}/hashtag/${encodeURIComponent(tag)}`,
      changeFrequency: "weekly",
      priority: 0.4,
    }));

  return [
    ...STATIC_ROUTES,
    ...articleEntries,
    ...regionEntries,
    ...sectorEntries,
    ...hashtagEntries,
    ...blogEntries,
  ];
}
