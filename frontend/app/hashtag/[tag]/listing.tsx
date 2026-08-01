import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByHashtag } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleCard from "@/components/ui/ArticleCard";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { HASHTAG_MIN_ARTICLES } from "@/lib/constants";

const HASHTAG_PAGE_SIZE = 12;

/** Shared body for /hashtag/[tag] and /hashtag/[tag]/sayfa/[n]. */
export async function hashtagMetadata(rawTag: string, page: number): Promise<Metadata> {
  const tag = decodeURIComponent(rawTag);

  // A tag carrying fewer than HASHTAG_MIN_ARTICLES articles is a thin
  // aggregation and is already excluded from sitemap.xml. Say so on the page
  // too (noindex, follow) instead of letting Google crawl it and file it under
  // "Taranan, ancak dizine eklenmedi". The articles themselves stay indexed.
  const { count } = await getArticlesByHashtag(tag, 1);
  const thin = count < HASHTAG_MIN_ARTICLES;

  return {
    title: titleWithPage(`#${tag} Haberleri`, page),
    description: `${tag} etiketiyle ilgili Afrika haberleri`,
    ...canonicalMeta(paginatedPath(`/hashtag/${encodeURIComponent(tag)}`, page)),
    ...paginatedRobots(page),
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HashtagListing({
  rawTag,
  page,
}: {
  rawTag: string;
  page: number;
}) {
  const tag = decodeURIComponent(rawTag);
  const { articles, count } = await getArticlesByHashtag(tag, page);

  if (articles.length === 0) notFound();

  const totalPages = Math.ceil(count / HASHTAG_PAGE_SIZE);
  const basePath = `/hashtag/${encodeURIComponent(tag)}`;

  return (
    <main className="max-w-container mx-auto px-4 md:px-6 py-8">
      <Breadcrumb items={[{ name: `#${tag}`, href: basePath }]} />
      <div className="border-t-2 border-primary mb-3" />
      <h1 className="font-headline text-2xl md:text-3xl font-black text-navy mb-1">
        #{tag}
      </h1>
      <p className="font-body text-sm text-on-surface/50 mb-8">
        {count} haber bulundu
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination page={page} total={count} basePath={basePath} pageSize={HASHTAG_PAGE_SIZE} />
        </div>
      )}
    </main>
  );
}
