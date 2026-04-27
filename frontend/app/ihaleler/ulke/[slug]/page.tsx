import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTendersByRegion,
  getTenderCategories,
  PAGE_SIZE,
} from "@/lib/queries/tenders";
import TenderCard from "@/components/ui/TenderCard";
import Pagination from "@/components/sections/Pagination";

export const revalidate = 1800;

const REGION_LABELS: Record<string, string> = {
  "afrika": "Afrika",
  "kuzey-afrika": "Kuzey Afrika",
  "bati-afrika": "Batı Afrika",
  "orta-afrika": "Orta Afrika",
  "dogu-afrika": "Dogu Afrika",
  "guney-afrika": "Guney Afrika",
};

const VALID_REGIONS = Object.keys(REGION_LABELS);

interface UlkePageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  return VALID_REGIONS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: UlkePageProps): Promise<Metadata> {
  const label = REGION_LABELS[params.slug];
  if (!label) return {};
  return {
    title: `Ihaleler: ${label}`,
    description: `${label} bolgesindeki Afrika ihaleleri.`,
  };
}

export default async function UlkePage({ params, searchParams }: UlkePageProps) {
  const regionLabel = REGION_LABELS[params.slug];
  if (!regionLabel) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const [{ tenders, count }, categories] = await Promise.all([
    getTendersByRegion(params.slug, page),
    getTenderCategories(),
  ]);

  const categoryMap: Record<string, string> = {};
  categories.forEach((c) => { categoryMap[c.slug] = c.name_tr; });

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <nav aria-label="Sayfa yolu" className="mb-3 flex items-center gap-2 font-body text-sm text-on-surface/50">
          <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
          <span>/</span>
          <a href="/ihaleler" className="hover:text-primary transition-colors">Ihaleler</a>
          <span>/</span>
          <span className="text-on-surface/30">{regionLabel}</span>
        </nav>
        <h1 className="font-headline text-3xl text-on-surface">{regionLabel} Ihaleleri</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} ihale</p>
        )}
      </header>

      {tenders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-on-surface/50">Bu bolgede ihale bulunamadı.</p>
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

      <Pagination
        page={page}
        total={count}
        basePath={`/ihaleler/ulke/${params.slug}`}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
