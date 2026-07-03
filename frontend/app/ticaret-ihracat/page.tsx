import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { buildCanonical, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

interface TicaretIhracatPageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: TicaretIhracatPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Ticaret & İhracat", page),
    description: "Afrika ile ticaret ve ihracat haberleri.",
    alternates: { canonical: buildCanonical("/ticaret-ihracat", { sayfa: String(page) }) },
  };
}

export default async function TicaretIhracatPage({ searchParams }: TicaretIhracatPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("ticaret-ihracat", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">Ticaret & İhracat</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/ticaret-ihracat" />
    </main>
  );
}
