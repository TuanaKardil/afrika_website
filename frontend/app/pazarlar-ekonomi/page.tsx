import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

export const metadata: Metadata = {
  title: "Pazarlar & Ekonomi",
  description: "Afrika piyasaları ve ekonomi haberleri.",
};

export default async function PazarlarEkonomiPage({
  searchParams,
}: {
  searchParams: { sayfa?: string };
}) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("pazarlar-ekonomi", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">Pazarlar & Ekonomi</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/pazarlar-ekonomi" />
    </main>
  );
}
