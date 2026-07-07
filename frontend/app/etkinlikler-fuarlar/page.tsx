import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

interface EtkinliklerFuarlarPageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: EtkinliklerFuarlarPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Etkinlikler & Fuarlar", page),
    description: "Afrika iş fuarları ve etkinlik haberleri.",
    ...canonicalMeta("/etkinlikler-fuarlar", { sayfa: String(page) }),
  };
}

export default async function EtkinliklerFuarlarPage({ searchParams }: EtkinliklerFuarlarPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("etkinlikler-fuarlar", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">Etkinlikler & Fuarlar</h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/etkinlikler-fuarlar" />
    </main>
  );
}
