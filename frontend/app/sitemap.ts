import type { MetadataRoute } from "next";
import { createBuildClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.afrikahaberleri.tr";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, priority: 1.0, changeFrequency: "hourly" },
  { url: `${BASE_URL}/firsatlar`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/pazarlar-ekonomi`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/ticaret-ihracat`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/sektorler`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/etkinlikler-fuarlar`, priority: 0.8, changeFrequency: "daily" },
  { url: `${BASE_URL}/ulkeler`, priority: 0.8, changeFrequency: "daily" },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createBuildClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, updated_at")
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
    .gte("score", 6);

  const articleEntries: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE_URL}/haber/${a.slug}`,
    lastModified: a.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...articleEntries];
}
