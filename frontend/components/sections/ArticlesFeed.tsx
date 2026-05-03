import { getLatestArticles } from "@/lib/queries/articles";
import ArticleGrid from "./ArticleGrid";
import Pagination from "./Pagination";

interface ArticlesFeedProps {
  page: number;
  excludeIds: string[];
}

export default async function ArticlesFeed({ page, excludeIds }: ArticlesFeedProps) {
  const { articles, count } = await getLatestArticles(page, excludeIds);
  return (
    <>
      <ArticleGrid
        articles={articles}
        eyebrow="SON HABERLER"
        action="Tümünü Gör"
        actionHref="/haberler"
      />
      <Pagination page={page} total={count} basePath="/" />
    </>
  );
}
