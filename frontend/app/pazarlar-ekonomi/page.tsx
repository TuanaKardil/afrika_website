import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

interface PazarlarEkonomiPageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: PazarlarEkonomiPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Pazarlar & Ekonomi", page),
    description: "Afrika piyasaları ve ekonomi haberleri.",
    ...canonicalMeta("/pazarlar-ekonomi", { sayfa: String(page) }),
  };
}

export default async function PazarlarEkonomiPage({ searchParams }: PazarlarEkonomiPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("pazarlar-ekonomi", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: "Pazarlar & Ekonomi", href: "/pazarlar-ekonomi" }]} />
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
