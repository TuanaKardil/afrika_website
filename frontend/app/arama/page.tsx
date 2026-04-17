import type { Metadata } from "next";
import { Suspense } from "react";
import { searchArticles } from "@/lib/queries/search";
import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Haber Ara",
  description: "Afrika haberlerinde arama yapin.",
};

interface AramaPageProps {
  searchParams: { q?: string; sayfa?: string };
}

function SearchInputFallback() {
  return (
    <div className="w-full h-12 rounded-xl bg-surface-container animate-pulse" />
  );
}

export default async function AramaPage({ searchParams }: AramaPageProps) {
  const query = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

  const { articles, count } = query.length >= 2
    ? await searchArticles(query, page)
    : { articles: [], count: 0 };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-headline text-3xl text-on-surface mb-6">Haber Ara</h1>

      {/* Search input -- wrapped in Suspense because it uses useSearchParams */}
      <div className="mb-8">
        <Suspense fallback={<SearchInputFallback />}>
          <SearchInput initialValue={query} />
        </Suspense>
      </div>

      {/* State: no query yet */}
      {query.length < 2 && (
        <div className="py-16 text-center">
          <p className="font-body text-on-surface/50">
            Aramak istediginiz konuyu yaziniz.
          </p>
        </div>
      )}

      {/* State: results or no-results */}
      {query.length >= 2 && (
        <SearchResults
          articles={articles}
          count={count}
          query={query}
          page={page}
        />
      )}
    </main>
  );
}
