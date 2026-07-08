import type { Metadata } from "next";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

interface TurkIsDunyasiPageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: TurkIsDunyasiPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Türk İş Dünyası Afrika'da", page),
    description: "Afrika'daki Türk şirketleri ve iş insanları haberleri.",
    ...canonicalMeta("/turk-is-dunyasi", { sayfa: String(page) }),
  };
}

export default async function TurkIsDunyasiPage({ searchParams }: TurkIsDunyasiPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByNavTab("turk-is-dunyasi", page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: "Türk İş Dünyası", href: "/turk-is-dunyasi" }]} />
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
