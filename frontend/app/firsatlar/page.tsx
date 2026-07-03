import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { buildCanonical, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

interface FirsatlarPageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: FirsatlarPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Fırsatlar", page),
    description: "Afrika'dan yatırım fırsatları ve proje haberleri.",
    alternates: { canonical: buildCanonical("/firsatlar", { sayfa: String(page) }) },
  };
}

export default async function FirsatlarPage({ searchParams }: FirsatlarPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("firsatlar", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">Fırsatlar</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/firsatlar" />
    </main>
  );
}
