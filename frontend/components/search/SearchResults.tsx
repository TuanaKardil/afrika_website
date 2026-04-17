import type { Article } from "@/lib/queries/articles";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import { SEARCH_PAGE_SIZE } from "@/lib/queries/search";

interface SearchResultsProps {
  articles: Article[];
  count: number;
  query: string;
  page: number;
}

export default function SearchResults({
  articles,
  count,
  query,
  page,
}: SearchResultsProps) {
  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-on-surface/50">
          <span className="font-medium text-on-surface">&ldquo;{query}&rdquo;</span> icin
          sonuc bulunamadi.
        </p>
        <p className="font-body text-sm text-on-surface/40 mt-2">
          Farkli anahtar kelimeler deneyin.
        </p>
      </div>
    );
  }

  const basePath = `/arama?q=${encodeURIComponent(query)}`;

  return (
    <section>
      <p className="font-body text-sm text-on-surface/50 mb-6">
        <span className="font-medium text-on-surface">&ldquo;{query}&rdquo;</span> icin{" "}
        <span className="font-medium text-on-surface">{count}</span> sonuc bulundu
      </p>

      <ArticleGrid articles={articles} />

      <Pagination
        page={page}
        total={count}
        basePath={basePath}
        pageSize={SEARCH_PAGE_SIZE}
      />
    </section>
  );
}
