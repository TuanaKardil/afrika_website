import type { ArticleListItem } from "@/lib/queries/articles";
import { formatDateShort } from "@/lib/utils";
import { resolveCategory } from "@/lib/labels";
import ReadingTime from "@/components/ui/ReadingTime";

interface NextArticleCardProps {
  article: ArticleListItem;
}

/**
 * "Sonraki Haber" card closing the article body.
 *
 * Server component with no client JS. It complements the "Benzer Haberler"
 * sidebar rather than repeating it: the sidebar offers related articles, this
 * offers the next one in the feed, so a reader is never shown the same article
 * twice on one page.
 */
export default function NextArticleCard({ article }: NextArticleCardProps) {
  const href = `/haber/${article.slug}`;
  const category = resolveCategory(
    article.nav_tab_slug,
    article.sector_slugs ?? [],
    article.hashtags
  );

  return (
    <aside className="mt-12 pt-6 border-t-2 border-navy">
      <p className="font-body text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface/40 mb-4">
        Sonraki Haber
      </p>

      <a
        href={href}
        className="group block border border-outline-variant transition-colors duration-[120ms] hover:border-primary sm:flex"
      >
        {/* Image: full width stacked on mobile, fixed rail from sm.
            width/height encode the 16:10 BOX ratio (rule 19); object-cover
            crops, so they exist to reserve space, not to describe the file. */}
        <div className="relative aspect-[16/10] bg-surface-2 overflow-hidden sm:w-[280px] sm:shrink-0 sm:aspect-auto sm:min-h-[176px]">
          {article.featured_image_url ? (
            <img
              src={article.featured_image_url}
              srcSet={article.image_srcset ?? undefined}
              sizes="(min-width: 640px) 280px, 100vw"
              alt={article.image_alt_tr ?? article.title_tr ?? ""}
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
          )}
        </div>

        <div className="flex flex-col justify-center flex-1 p-5 md:p-6">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
            <span className="font-body text-[11px] font-semibold tracking-[0.07em] uppercase text-on-surface/50">
              {formatDateShort(article.published_at)}
              {category ? ` • ${category.toLocaleUpperCase("tr-TR")}` : ""}
            </span>
          </div>

          <h2 className="font-headline text-base md:text-lg font-black leading-snug text-navy group-hover:underline underline-offset-[3px] decoration-[1px]">
            {article.title_tr}
          </h2>

          <div className="flex items-center justify-between gap-4 mt-4">
            <ReadingTime minutes={article.reading_time_minutes} />
            <span className="font-body text-xs font-semibold text-primary shrink-0">
              Haberi oku &rarr;
            </span>
          </div>
        </div>
      </a>
    </aside>
  );
}
