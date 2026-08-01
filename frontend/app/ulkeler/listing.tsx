import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticlesByNavTab,
  getArticlesByCountry,
  COUNTRY_SLUG_TO_HASHTAG,
  PAGE_SIZE,
} from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

/**
 * Shared body for the country listings.
 *
 * The country filter used to be "?ulke=<slug>", which made the whole route
 * dynamic. It is a closed set of 54 slugs, so it became a path segment
 * (/ulkeler/kenya) and every country page now prerenders. `slug` null is the
 * unfiltered index at /ulkeler.
 */
export function countryHashtag(slug: string): string | null {
  return COUNTRY_SLUG_TO_HASHTAG[slug] ?? null;
}

export async function countryMetadata(
  slug: string | null,
  page: number
): Promise<Metadata> {
  const hashtag = slug ? countryHashtag(slug) : null;
  const basePath = hashtag ? `/ulkeler/${slug}` : "/ulkeler";
  const seo = {
    ...canonicalMeta(paginatedPath(basePath, page)),
    ...paginatedRobots(page),
  };

  if (hashtag) {
    return {
      title: titleWithPage(`Son Dakika ${hashtag} Haberleri`, page),
      description: `${hashtag} ile ilgili güncel Afrika haberleri. Ekonomi, ticaret ve yatırım gelişmeleri.`,
      ...seo,
    };
  }
  return {
    title: titleWithPage("Afrika Ülke Haberleri", page),
    description:
      "Afrika ülkelerinden son dakika haberleri. Ülke bazında ekonomi, ticaret ve siyasi gelişmeleri takip edin.",
    ...seo,
  };
}

export function countrySlugs() {
  return Object.keys(COUNTRY_SLUG_TO_HASHTAG).map((ulke) => ({ ulke }));
}

/** Page numbers >= 2 for the unfiltered index. */
export async function countryIndexPageParams() {
  const { count } = await getArticlesByNavTab("ulkeler", 1);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export default async function CountryListing({
  slug,
  page,
}: {
  slug: string | null;
  page: number;
}) {
  const hashtag = slug ? countryHashtag(slug) : null;
  if (slug && !hashtag) notFound();

  const { articles, count } = hashtag
    ? await getArticlesByCountry(hashtag, page)
    : await getArticlesByNavTab("ulkeler", page);

  const basePath = hashtag ? `/ulkeler/${slug}` : "/ulkeler";
  const heading = hashtag ? `Son Dakika ${hashtag} Haberleri` : "Afrika Ülke Haberleri";

  return (
    <main className="max-w-container mx-auto px-6 py-8">
      <Breadcrumb items={[{ name: "Ülkeler", href: "/ulkeler" }]} />
      <header className="mb-6">
        {hashtag && (
          <div className="mb-3">
            <Link
              href="/ulkeler"
              className="text-xs font-bold text-primary hover:underline hover:underline-offset-[3px] tracking-[0.04em]"
            >
              &larr; Tüm Ülkeler
            </Link>
          </div>
        )}
        <h1 className="text-3xl font-black text-navy tracking-tight">{heading}</h1>
        {count > 0 && <p className="text-sm text-fg-3 mt-1">{count} haber</p>}
        {hashtag && count === 0 && (
          <p className="text-sm text-fg-3 mt-2">
            {hashtag} için henüz haber bulunamadı.
          </p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
