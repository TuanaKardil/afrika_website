import type { Metadata } from "next";
import Link from "next/link";
import { getFilteredArticles } from "@/lib/queries/articles";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Tüm Haberler | Afrika Haberleri",
  description: "Afrika'dan tüm son dakika haberleri. Bölge ve kategori filtresiyle arama yapın.",
};

const REGIONS = [
  { slug: "afrika", label: "Tüm Afrika" },
  { slug: "kuzey-afrika", label: "Kuzey Afrika" },
  { slug: "bati-afrika", label: "Batı Afrika" },
  { slug: "orta-afrika", label: "Orta Afrika" },
  { slug: "dogu-afrika", label: "Doğu Afrika" },
  { slug: "guney-afrika", label: "Güney Afrika" },
];

const CATEGORIES = [
  { slug: "firsatlar", label: "Fırsatlar" },
  { slug: "pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { slug: "ticaret-ihracat", label: "Ticaret & İhracat" },
  { slug: "sektorler", label: "Sektörler" },
  { slug: "ulkeler", label: "Ülkeler" },
  { slug: "diger", label: "Diğer" },
];

interface HaberlerPageProps {
  searchParams: { sayfa?: string; bolge?: string; kategori?: string };
}

function buildFilterUrl(
  bolge: string | null,
  kategori: string | null,
  type: "bolge" | "kategori",
  slug: string | null
): string {
  const params = new URLSearchParams();
  const nextBolge = type === "bolge" ? slug : bolge;
  const nextKategori = type === "kategori" ? slug : kategori;
  if (nextBolge && nextBolge !== "afrika") params.set("bolge", nextBolge);
  if (nextKategori) params.set("kategori", nextKategori);
  const qs = params.toString();
  return qs ? `/haberler?${qs}` : "/haberler";
}

export default async function HaberlerPage({ searchParams }: HaberlerPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const bolge = searchParams.bolge ?? null;
  const kategori = searchParams.kategori ?? null;

  const { articles, count } = await getFilteredArticles(page, bolge, kategori);

  const filterParams = new URLSearchParams();
  if (bolge) filterParams.set("bolge", bolge);
  if (kategori) filterParams.set("kategori", kategori);
  const filterStr = filterParams.toString();
  const basePath = filterStr ? `/haberler?${filterStr}` : "/haberler";

  const activeRegionLabel = REGIONS.find((r) => r.slug === (bolge ?? "afrika"))?.label ?? "Tüm Afrika";
  const activeKategoriLabel = CATEGORIES.find((c) => c.slug === kategori)?.label ?? null;

  return (
    <main className="max-w-container mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-headline text-3xl text-on-surface mb-1">
          {activeKategoriLabel ?? "Tüm Haberler"}
          {bolge && bolge !== "afrika" && (
            <span className="text-on-surface/40">, {activeRegionLabel}</span>
          )}
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50">{count} haber</p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-5">
        {/* Bölge filter */}
        <div>
          <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2.5">
            Bölge
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const isActive = r.slug === "afrika"
                ? !bolge || bolge === "afrika"
                : bolge === r.slug;
              return (
                <Link
                  key={r.slug}
                  href={buildFilterUrl(bolge, kategori, "bolge", r.slug === "afrika" ? null : r.slug)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    isActive
                      ? "bg-primary text-white border-primary"
                      : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
                  }`}
                >
                  {r.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Kategori filter */}
        <div>
          <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2.5">
            Kategori
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterUrl(bolge, kategori, "kategori", null)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                !kategori
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
              }`}
            >
              Tümü
            </Link>
            {CATEGORIES.map((c) => {
              const isActive = kategori === c.slug;
              return (
                <Link
                  key={c.slug}
                  href={buildFilterUrl(bolge, kategori, "kategori", c.slug)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    isActive
                      ? "bg-primary text-white border-primary"
                      : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <ArticleGrid articles={articles} eyebrow="HABERLER" />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
