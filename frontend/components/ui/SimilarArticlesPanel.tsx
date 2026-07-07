import type { Article } from "@/lib/queries/articles";
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
      <div className="flex flex-col divide-y divide-gray-200">
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
              className="group flex flex-col gap-2 pt-5 first:pt-0"
            >
              {/* Thumbnail */}
              <div className="w-full h-[130px] overflow-hidden bg-surface-2 rounded-sm">
                {article.featured_image_url ? (
                  <img
                    src={article.featured_image_url}
                    srcSet={article.image_srcset ?? undefined}
                    sizes="(min-width: 1024px) 300px, 100vw"
                    alt={article.image_alt_tr ?? article.title_tr ?? ""}
                    width={300}
                    height={130}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
                )}
              </div>

              {/* Text */}
              <div>
                {category && (
                  <p className="text-[10px] font-semibold tracking-[0.07em] uppercase text-primary mb-1">
                    {category.toLocaleUpperCase("tr-TR")}
                  </p>
                )}
                <h3 className="text-sm font-bold leading-[1.35] text-navy line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
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
