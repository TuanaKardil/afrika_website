import type { Article } from "@/lib/queries/articles";
import { formatDateShort } from "@/lib/utils";
import { resolveCategory } from "@/lib/labels";

interface SimilarArticlesPanelProps {
  articles: Article[];
}

export default function SimilarArticlesPanel({ articles }: SimilarArticlesPanelProps) {
  if (articles.length === 0) return null;

  return (
    <aside>
      <div className="border-t-2 border-primary mb-3" />
      <p className="text-[11px] font-black tracking-[0.1em] uppercase text-navy mb-4">
        Benzer Haberler
      </p>
      <div className="flex flex-col gap-4">
        {articles.map((article) => {
          const category = resolveCategory(
            article.nav_tab_slug,
            article.sector_slugs ?? [],
            article.hashtags
          );
          return (
            <a
              key={article.id}
              href={`/haber/${article.slug}`}
              className="group flex gap-3 items-start"
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-20 h-[52px] overflow-hidden bg-surface-2 rounded-sm">
                {article.featured_image_url ? (
                  <img
                    src={article.featured_image_url}
                    alt={article.title_tr ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.07em] uppercase text-fg-3 mb-0.5 truncate">
                  {formatDateShort(article.published_at)}
                  {category ? ` • ${category.toLocaleUpperCase("tr-TR")}` : ""}
                </p>
                <h3 className="text-[13px] font-bold leading-[1.3] text-navy line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                  {article.title_tr}
                </h3>
              </div>
            </a>
          );
        })}
      </div>
    </aside>
  );
}
