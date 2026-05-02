import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

export const metadata: Metadata = {
  title: "Türk İş Dünyası Afrika'da",
  description: "Afrika'daki Türk şirketleri ve iş insanları haberleri.",
};

export default async function TurkIsDunyasiPage({
  searchParams,
}: {
  searchParams: { sayfa?: string };
}) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("turk-is-dunyasi", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          Türk İş Dünyası Afrika'da
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/turk-is-dunyasi" />
    </main>
  );
}
