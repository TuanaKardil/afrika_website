import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import { formatDateShort } from "@/lib/utils";
import { resolveCategory } from "@/lib/labels";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const href = `/haber/${article.slug}`;
  const category = resolveCategory(article.nav_tab_slug, article.sector_slugs ?? [], article.hashtags);

  return (
    <article className="article-card-lazy group flex flex-col border border-outline-variant bg-surface transition-[border-color] duration-[120ms] hover:border-border-strong">
      {/* Image */}
      <Link href={href} className="block overflow-hidden aspect-[16/10] relative bg-surface-2">
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.image_alt_tr ?? article.title_tr ?? ""}
            width={1600}
            height={1000}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 px-2.5 pt-2.5 pb-3 md:px-4 md:pt-3.5 md:pb-4">
        {/* Meta: amber dot + date + category */}
        <div className="flex items-center gap-1 mb-1.5 md:gap-1.5 md:mb-2">
          <span className="w-[4px] h-[4px] md:w-[5px] md:h-[5px] rounded-full bg-amber shrink-0" />
          <span className="text-[9px] md:text-[11px] font-semibold tracking-[0.07em] uppercase text-fg-3">
            {formatDateShort(article.published_at)}
            {category ? ` • ${category.toLocaleUpperCase("tr-TR")}` : ""}
          </span>
        </div>

        {/* Title */}
        <Link href={href}>
          <h2 className="text-[13px] md:text-base font-black leading-[1.28] tracking-tight text-navy line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
            {article.title_tr}
          </h2>
        </Link>
      </div>
    </article>
  );
}
