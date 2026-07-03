import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByHashtag } from "@/lib/queries/articles";
import { buildCanonical, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleCard from "@/components/ui/ArticleCard";
import Pagination from "@/components/sections/Pagination";

export const revalidate = 1800;

interface HashtagPageProps {
  params: { tag: string };
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ params, searchParams }: HashtagPageProps): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag);
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage(`#${tag} Haberleri`, page),
    description: `${tag} etiketiyle ilgili Afrika haberleri`,
    alternates: {
      canonical: buildCanonical(`/hashtag/${encodeURIComponent(tag)}`, { sayfa: String(page) }),
    },
  };
}

export default async function HashtagPage({ params, searchParams }: HashtagPageProps) {
  const tag = decodeURIComponent(params.tag);
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

  const { articles, count } = await getArticlesByHashtag(tag, page);

  if (page === 1 && articles.length === 0) notFound();

  const totalPages = Math.ceil(count / 12);

  return (
    <main className="max-w-container mx-auto px-4 md:px-6 py-8">
      <div className="border-t-2 border-primary mb-3" />
      <h1 className="font-headline text-2xl md:text-3xl font-black text-navy mb-1">
        #{tag}
      </h1>
      <p className="font-body text-sm text-on-surface/50 mb-8">
        {count} haber bulundu
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            page={page}
            total={count}
            basePath={`/hashtag/${encodeURIComponent(tag)}`}
          />
        </div>
      )}
    </main>
  );
}
