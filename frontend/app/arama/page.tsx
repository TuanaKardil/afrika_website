import type { Metadata } from "next";
import { Suspense } from "react";
import { searchArticles, type SearchFilters } from "@/lib/queries/search";
import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Haber Ara | Afrika Haberleri",
  description: "Afrika haberlerinde arama yapın.",
  robots: { index: false, follow: false },
};

const CATEGORY_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "firsatlar", label: "Fırsatlar" },
  { value: "pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { value: "ticaret-ihracat", label: "Ticaret & İhracat" },
  { value: "sektorler", label: "Sektörler" },
  { value: "ulkeler", label: "Ülkeler" },
];

const DATE_FILTERS = [
  { value: "", label: "Tüm Zamanlar" },
  { value: "1d", label: "Son 24 Saat" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
];

interface AramaPageProps {
  searchParams: {
    q?: string;
    sayfa?: string;
    kategori?: string;
    tarih?: string;
  };
}

function FilterChips({
  items,
  active,
  paramKey,
  query,
}: {
  items: { value: string; label: string }[];
  active: string;
  paramKey: string;
  query: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ value, label }) => {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (value) params.set(paramKey, value);
        const href = `/arama${params.size ? `?${params}` : ""}`;
        const isActive = active === value;
        return (
          <a
            key={value}
            href={href}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              isActive
                ? "bg-primary text-white border-primary"
                : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

function SearchInputFallback() {
  return <div className="w-full h-12 rounded-xl bg-surface-container animate-pulse" />;
}

export default async function AramaPage({ searchParams }: AramaPageProps) {
  const query = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const kategori = searchParams.kategori ?? "";
  const tarih = searchParams.tarih ?? "";

  const filters: SearchFilters = {
    navTab: kategori || null,
    dateRange: tarih || null,
  };

  const { articles, count } = query.length >= 2
    ? await searchArticles(query, page, filters)
    : { articles: [], count: 0 };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="border-t-2 border-primary mb-3" />
      <h1 className="font-headline text-2xl md:text-3xl font-black text-navy mb-6">
        {query.length >= 2 ? `"${query}" için arama sonuçları` : "Haber Ara"}
      </h1>

      {/* Search input */}
      <div className="mb-6">
        <Suspense fallback={<SearchInputFallback />}>
          <SearchInput initialValue={query} />
        </Suspense>
      </div>

      {/* Filters — only when there is a query */}
      {query.length >= 2 && (
        <div className="mb-8 space-y-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2">
              Kategori
            </p>
            <FilterChips
              items={CATEGORY_FILTERS}
              active={kategori}
              paramKey="kategori"
              query={query}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2">
              Tarih
            </p>
            <FilterChips
              items={DATE_FILTERS}
              active={tarih}
              paramKey="tarih"
              query={query}
            />
          </div>
        </div>
      )}

      {/* State: no query yet */}
      {query.length < 2 && (
        <div className="py-16 text-center">
          <p className="font-body text-on-surface/50 mb-6">
            Aramak istediğiniz konuyu yazınız.
          </p>
          <p className="text-[11px] font-black tracking-[0.1em] uppercase text-on-surface/30 mb-3">
            Popüler Kategoriler
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Fırsatlar", href: "/firsatlar" },
              { label: "Pazarlar & Ekonomi", href: "/pazarlar-ekonomi" },
              { label: "Ticaret & İhracat", href: "/ticaret-ihracat" },
              { label: "Sektörler", href: "/sektorler" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full border border-outline-variant text-on-surface/60 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {query.length >= 2 && (
        <SearchResults
          articles={articles}
          count={count}
          query={query}
          page={page}
          filters={filters}
        />
      )}
    </main>
  );
}
