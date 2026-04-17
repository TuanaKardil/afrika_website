import type { Article } from "@/lib/queries/articles";
import ArticleCard from "@/components/ui/ArticleCard";
import ArticleCardSkeleton from "@/components/ui/ArticleCardSkeleton";

interface ArticleGridProps {
  articles: Article[];
  loading?: boolean;
}

export default function ArticleGrid({ articles, loading = false }: ArticleGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-on-surface/50">Haber bulunamadi.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
