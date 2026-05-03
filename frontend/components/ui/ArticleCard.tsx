import Image from "next/image";
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
    <article className="group flex flex-col border border-outline-variant bg-surface transition-[border-color] duration-[120ms] hover:border-border-strong">
      {/* Image */}
      <Link href={href} className="block overflow-hidden aspect-[16/10] relative bg-surface-2">
        {article.featured_image_url ? (
          <Image
            src={article.featured_image_url}
            alt={article.title_tr ?? ""}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
        {/* Meta: amber dot + date + category */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-fg-3">
            {formatDateShort(article.published_at)}
            {category ? ` • ${category.toLocaleUpperCase("tr-TR")}` : ""}
          </span>
        </div>

        {/* Title */}
        <Link href={href}>
          <h2 className="text-base font-black leading-[1.28] tracking-tight text-navy line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
            {article.title_tr}
          </h2>
        </Link>
      </div>
    </article>
  );
}
