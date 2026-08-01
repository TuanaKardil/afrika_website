import type { Metadata } from "next";
import { getArticlesByNavTab, PAGE_SIZE } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import type { NavTabListing as Config } from "@/lib/nav-tab-listings";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

/**
 * The body every nav-tab listing shares, for both /<tab> and /<tab>/sayfa/[n].
 *
 * Page 1 lives at the bare path with NO searchParams anywhere in the route, so
 * it prerenders. Reading searchParams (even only inside generateMetadata) marks
 * the whole segment dynamic in Next 14 and silently voids revalidate and
 * generateStaticParams.
 */
export async function navTabMetadata(config: Config, page: number): Promise<Metadata> {
  return {
    title: titleWithPage(config.title, page),
    description: config.description,
    ...canonicalMeta(paginatedPath(config.basePath, page)),
    ...paginatedRobots(page),
  };
}

/** Total pages, for generateStaticParams on the /sayfa/[n] twin. */
export async function navTabPageParams(config: Config): Promise<{ n: string }[]> {
  const { count } = await getArticlesByNavTab(config.navTab, 1);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export default async function NavTabListing({
  config,
  page,
}: {
  config: Config;
  page: number;
}) {
  const { articles, count } = await getArticlesByNavTab(config.navTab, page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: config.crumb, href: config.basePath }]} />
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">{config.heading}</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={config.basePath} />
    </main>
  );
}
