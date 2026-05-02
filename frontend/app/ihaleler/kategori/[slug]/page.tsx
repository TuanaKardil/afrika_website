import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTendersByCategory,
  getTenderCategories,
  PAGE_SIZE,
} from "@/lib/queries/tenders";
import TenderCard from "@/components/ui/TenderCard";
import Pagination from "@/components/sections/Pagination";

export const revalidate = 1800;

interface KategoriPageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const categories = await getTenderCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: KategoriPageProps): Promise<Metadata> {
  const categories = await getTenderCategories();
  const category = categories.find((c) => c.slug === params.slug);
  if (!category) return {};
  return {
    title: `Ihaleler: ${category.name_tr}`,
    description: `${category.name_tr} kategorisindeki Afrika ihaleleri.`,
  };
}

export default async function KategoriPage({ params, searchParams }: KategoriPageProps) {
  const categories = await getTenderCategories();
  const category = categories.find((c) => c.slug === params.slug);
  if (!category) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { tenders, count } = await getTendersByCategory(params.slug, page);

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
          <span className="text-on-surface/30">{category.name_tr}</span>
        </nav>
        <h1 className="font-headline text-3xl text-on-surface">{category.name_tr}</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} ihale</p>
        )}
      </header>

      {tenders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-on-surface/50">Bu kategoride ihale bulunamadı.</p>
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
        basePath={`/ihaleler/kategori/${params.slug}`}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
