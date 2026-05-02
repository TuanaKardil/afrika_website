import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import ArticleCard from "@/components/ui/ArticleCard";
import ArticleCardSkeleton from "@/components/ui/ArticleCardSkeleton";

interface ArticleGridProps {
  articles: Article[];
  loading?: boolean;
  eyebrow?: string;
  action?: string;
  actionHref?: string;
}

export default function ArticleGrid({
  articles,
  loading = false,
  eyebrow = "SON HABERLER",
  action,
  actionHref,
}: ArticleGridProps) {
  return (
    <div>
      {/* Section eyebrow */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex-1">
          <div className="border-t-2 border-primary mb-3" />
          <span className="text-base font-bold tracking-[0.08em] uppercase text-navy">{eyebrow}</span>
        </div>
        {action && actionHref && (
          <Link
            href={actionHref}
            className="text-xs font-bold tracking-[0.06em] text-primary uppercase hover:underline hover:underline-offset-[3px] pb-0.5 whitespace-nowrap ml-4"
          >
            {action} &rarr;
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-on-surface/50">Haber bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
