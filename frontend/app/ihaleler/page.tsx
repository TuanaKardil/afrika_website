import type { Metadata } from "next";
import Link from "next/link";
import {
  getTenders,
  getTenderCategories,
  getTenderStats,
  PAGE_SIZE,
  type TenderFilters,
  type TenderStatus,
} from "@/lib/queries/tenders";
import TenderCard from "@/components/ui/TenderCard";
import Pagination from "@/components/sections/Pagination";
import StatsBar from "./StatsBar";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Ihaleler",
  description: "Afrika'daki guncel ihale ve proje ilanları.",
};

interface IhalelerPageProps {
  searchParams: {
    sayfa?: string;
    status?: string;
    category?: string;
    region?: string;
    source?: string;
  };
}

const STATUS_OPTIONS: { value: TenderStatus | ""; label: string }[] = [
  { value: "", label: "Tumu" },
  { value: "active", label: "Aktif" },
  { value: "planned", label: "Planlandı" },
  { value: "expired", label: "Suresi Doldu" },
];

const REGION_OPTIONS = [
  { value: "", label: "Tum Bolgeler" },
  { value: "afrika", label: "Afrika" },
  { value: "kuzey-afrika", label: "Kuzey Afrika" },
  { value: "bati-afrika", label: "Batı Afrika" },
  { value: "orta-afrika", label: "Orta Afrika" },
  { value: "dogu-afrika", label: "Dogu Afrika" },
  { value: "guney-afrika", label: "Guney Afrika" },
];

function buildFilterUrl(
  base: string,
  current: Record<string, string>,
  update: Record<string, string>
): string {
  const merged = { ...current, ...update };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function IhalelerPage({ searchParams }: IhalelerPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

  const rawStatus = searchParams.status ?? "";
  const validStatuses: string[] = ["active", "planned", "expired", ""];
  const statusFilter = validStatuses.includes(rawStatus)
    ? (rawStatus as TenderStatus | "")
    : "";

  const filters: TenderFilters = {
    status: statusFilter,
    category: searchParams.category ?? "",
    region: searchParams.region ?? "",
    source: searchParams.source ?? "",
  };

  const [{ tenders, count }, categories, stats] = await Promise.all([
    getTenders(page, filters),
    getTenderCategories(),
    getTenderStats(),
  ]);

  // Build a lookup map from category slug to name_tr for TenderCard
  const categoryMap: Record<string, string> = {};
  categories.forEach((c) => { categoryMap[c.slug] = c.name_tr; });

  // For pagination, include filter params
  const paginationBase = buildFilterUrl("/ihaleler", {}, {
    status: filters.status ?? "",
    category: filters.category ?? "",
    region: filters.region ?? "",
    source: filters.source ?? "",
  });

  return (
    <main>
      {/* Hero stats bar */}
      <StatsBar stats={stats} />

      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="font-headline text-3xl text-on-surface">Ihaleler</h1>
          {count > 0 && (
            <p className="font-body text-sm text-on-surface/50 mt-1">{count} ihale</p>
          )}
        </header>

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-30 bg-background border-b border-outline-variant py-3 mb-6 -mx-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status tabs */}
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = (filters.status ?? "") === opt.value;
                const href = buildFilterUrl("/ihaleler", {
                  category: filters.category ?? "",
                  region: filters.region ?? "",
                  source: filters.source ?? "",
                }, { status: opt.value });
                return (
                  <Link
                    key={opt.value || "all"}
                    href={href}
                    className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-white font-semibold"
                        : "text-on-surface/70 hover:text-primary"
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>

            {/* Region select */}
            <div className="flex flex-wrap gap-1">
              {REGION_OPTIONS.slice(0, 4).map((opt) => {
                const isActive = (filters.region ?? "") === opt.value;
                const href = buildFilterUrl("/ihaleler", {
                  status: filters.status ?? "",
                  category: filters.category ?? "",
                  source: filters.source ?? "",
                }, { region: opt.value });
                return (
                  <Link
                    key={opt.value || "all-regions"}
                    href={href}
                    className={`px-2.5 py-1 rounded-full font-body text-xs transition-colors whitespace-nowrap border ${
                      isActive
                        ? "bg-primary text-white border-primary font-semibold"
                        : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Category filter chips (from DB) */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Link
                href={buildFilterUrl("/ihaleler", {
                  status: filters.status ?? "",
                  region: filters.region ?? "",
                  source: filters.source ?? "",
                }, { category: "" })}
                className={`px-2.5 py-1 rounded-full font-body text-xs transition-colors border ${
                  !(filters.category)
                    ? "bg-primary text-white border-primary font-semibold"
                    : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
                }`}
              >
                Tum Kategoriler
              </Link>
              {categories.map((cat) => {
                const isActive = filters.category === cat.slug;
                const href = buildFilterUrl("/ihaleler", {
                  status: filters.status ?? "",
                  region: filters.region ?? "",
                  source: filters.source ?? "",
                }, { category: cat.slug });
                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className={`px-2.5 py-1 rounded-full font-body text-xs transition-colors border ${
                      isActive
                        ? "bg-primary text-white border-primary font-semibold"
                        : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {cat.name_tr}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tender grid */}
        {tenders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-body text-on-surface/50">Ihale bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenders.map((tender) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                categoryNameTr={
                  tender.category_slug ? categoryMap[tender.category_slug] : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          total={count}
          basePath={paginationBase}
          pageSize={PAGE_SIZE}
        />
      </div>
    </main>
  );
}
