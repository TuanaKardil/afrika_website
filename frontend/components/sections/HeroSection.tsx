import ReactDOM from "react-dom";
import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import { formatDateShort } from "@/lib/utils";
import { resolveCategory } from "@/lib/labels";

interface HeroSectionProps {
  article: Article;
  secondaryArticles?: Article[];
  topArticles?: Article[];
}

export default function HeroSection({
  article,
  secondaryArticles = [],
  topArticles = [],
}: HeroSectionProps) {
  const href = `/haber/${article.slug}`;
  const category = resolveCategory(article.nav_tab_slug, article.sector_slugs ?? [], article.hashtags);

  // LCP: preload the homepage lead image (pairs with fetchPriority="high").
  if (article.featured_image_url) {
    ReactDOM.preload(article.featured_image_url, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: article.image_srcset ?? undefined,
      imageSizes: article.image_srcset ? "(min-width: 768px) 60vw, 100vw" : undefined,
    });
  }

  return (
    <section className="bg-white pt-4 md:pt-6">
      <div className="max-w-container mx-auto px-4 md:px-6">

        {/* Top row: lead (left) + secondary (right) */}
        <div className="grid grid-cols-[3fr_2fr] gap-2.5 md:gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)]">

          {/* Lead card */}
          <Link
            href={href}
            className="group relative block overflow-hidden bg-surface-2 aspect-[4/5] md:aspect-auto md:min-h-[420px]"
          >
            {article.featured_image_url ? (
              <img
                src={article.featured_image_url}
                srcSet={article.image_srcset ?? undefined}
                sizes="(min-width: 768px) 60vw, 100vw"
                alt={article.image_alt_tr ?? article.title_tr ?? ""}
                width={1200}
                height={1500}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a2351,#143063)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,35,81,0.92)_0%,rgba(10,35,81,0.55)_50%,rgba(10,35,81,0.05)_90%)]" />
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2 md:px-8 md:pb-7 md:pt-4">
              <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
                <span className="text-[10px] md:text-[11px] font-black tracking-[0.08em] md:tracking-[0.1em] uppercase text-amber line-clamp-1">
                  {formatDateShort(article.published_at)}
                  {category ? ` • ${category.toLocaleUpperCase("tr-TR")}` : ""}
                </span>
              </div>
              <h1 className="text-[13px] md:text-[30px] font-black leading-[1.18] tracking-[-0.018em] md:tracking-[-0.022em] text-white mb-1.5 md:mb-3 line-clamp-4 md:line-clamp-none group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                {article.title_tr}
              </h1>
              {article.excerpt_tr && (
                <p className="hidden md:block text-sm leading-[1.55] text-white/85 line-clamp-2 max-w-2xl">
                  {article.excerpt_tr}
                </p>
              )}
            </div>
          </Link>

          {/* Secondary cards column */}
          <div className="flex flex-col gap-2 md:gap-4 h-full">
            {secondaryArticles.slice(0, 2).map((sec) => (
              <Link
                key={sec.id}
                href={`/haber/${sec.slug}`}
                className="group flex flex-col flex-1 overflow-hidden border border-outline-variant bg-surface hover:border-border-strong transition-[border-color] duration-[120ms]"
              >
                <div className="relative flex-1 overflow-hidden bg-surface-2">
                  {sec.featured_image_url ? (
                    <img
                      src={sec.featured_image_url}
                      srcSet={sec.image_srcset ?? undefined}
                      sizes="(min-width: 768px) 20vw, 50vw"
                      alt={sec.image_alt_tr ?? sec.title_tr ?? ""}
                      width={1200}
                      height={900}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
                  )}
                </div>
                <div className="px-1.5 py-1.5 md:px-4 md:py-3 shrink-0">
                  <h2 className="text-[10px] md:text-[14px] font-black leading-[1.28] tracking-tight text-navy line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                    {sec.title_tr}
                  </h2>
                </div>
              </Link>
            ))}
          </div>

          {/* EN ÇOK OKUNANLAR — full width below on mobile, 3rd column on desktop */}
          <div className="col-span-2 md:col-span-1 flex flex-col mt-1 md:mt-0">
            <div className="border-t-2 border-primary mb-2.5 md:mb-3" />
            <div className="text-[11px] md:text-[13px] font-black tracking-[0.1em] uppercase text-navy mb-2.5 md:mb-3.5">
              EN ÇOK OKUNANLAR
            </div>

            {/* Mobile: 2-col compact grid | Desktop: single-col list with meta */}
            <ol className="grid grid-cols-2 gap-x-3 gap-y-2.5 md:grid-cols-1 md:gap-0 md:divide-y md:divide-outline-variant">
              {topArticles.slice(0, 5).map((top, idx) => {
                const topCategory = resolveCategory(top.nav_tab_slug, top.sector_slugs ?? [], top.hashtags);
                return (
                  <li key={top.id} className={idx === 4 ? "hidden md:block" : ""}>
                    <Link
                      href={`/haber/${top.slug}`}
                      className="group flex items-start gap-2 md:gap-3 md:py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="hidden md:flex items-center gap-1.5 mb-1">
                          <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
                          <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-fg-3 truncate">
                            {topCategory ?? formatDateShort(top.published_at)}
                          </span>
                        </div>
                        <h3 className="text-[10px] md:text-[14px] font-bold leading-[1.3] tracking-[-0.005em] text-on-surface line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                          {top.title_tr}
                        </h3>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
