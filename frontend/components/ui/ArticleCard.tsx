import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import CategoryBadge from "./CategoryBadge";
import ReadingTime from "./ReadingTime";
import { formatDateShort } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const href = `/haber/${article.slug}`;

  return (
    <article className="group flex flex-col rounded-xl shadow-card bg-surface-container overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* Image */}
      <Link href={href} className="block overflow-hidden aspect-video relative bg-outline-variant">
        {article.featured_image_url ? (
          <Image
            src={article.featured_image_url}
            alt={article.title_tr ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-outline-variant flex items-center justify-center">
            <span className="text-on-surface/30 font-body text-sm">Görsel yok</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {article.nav_tab_slug && (
            <CategoryBadge slug={article.nav_tab_slug} />
          )}
        </div>

        {/* Title */}
        <Link href={href}>
          <h2 className="font-headline text-lg leading-snug text-on-surface line-clamp-3 hover:text-primary transition-colors">
            {article.title_tr}
          </h2>
        </Link>

        {/* Excerpt */}
        {article.excerpt_tr && (
          <p className="font-body text-sm text-on-surface/70 line-clamp-2 leading-relaxed">
            {article.excerpt_tr}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-outline-variant">
          <div className="flex flex-col gap-0.5">
            {article.author_original && (
              <span className="font-body text-xs text-on-surface/60 truncate max-w-[140px]">
                {article.author_original}
              </span>
            )}
            <time
              dateTime={article.published_at}
              className="font-body text-xs text-on-surface/50"
            >
              {formatDateShort(article.published_at)}
            </time>
          </div>
          <ReadingTime minutes={article.reading_time_minutes} />
        </div>
      </div>
    </article>
  );
}
