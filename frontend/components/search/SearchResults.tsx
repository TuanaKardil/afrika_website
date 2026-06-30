import type { Article } from "@/lib/queries/articles";
import type { SearchFilters } from "@/lib/queries/search";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import { SEARCH_PAGE_SIZE } from "@/lib/queries/search";

interface SearchResultsProps {
  articles: Article[];
  count: number;
  query: string;
  page: number;
  filters?: SearchFilters;
}

export default function SearchResults({
  articles,
  count,
  query,
  page,
  filters = {},
}: SearchResultsProps) {
  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-on-surface/50">
          <span className="font-medium text-on-surface">&ldquo;{query}&rdquo;</span>{" "}
          için sonuç bulunamadı.
        </p>
        <p className="font-body text-sm text-on-surface/40 mt-2">
          Farklı anahtar kelimeler deneyin veya filtreleri kaldırın.
        </p>
      </div>
    );
  }

  // Build base path preserving active filters
  const baseParams = new URLSearchParams();
  baseParams.set("q", query);
  if (filters.navTab) baseParams.set("kategori", filters.navTab);
  if (filters.dateRange) baseParams.set("tarih", filters.dateRange);
  const basePath = `/arama?${baseParams.toString()}`;

  return (
    <section>
      <p className="font-body text-sm text-on-surface/50 mb-6">
        <span className="font-medium text-on-surface">&ldquo;{query}&rdquo;</span> için{" "}
        <span className="font-medium text-on-surface">{count.toLocaleString("tr-TR")}</span> haber bulundu
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
