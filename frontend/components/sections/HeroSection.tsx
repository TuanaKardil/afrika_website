import Image from "next/image";
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
  const category = resolveCategory(article.nav_tab_slug, article.sector_slugs ?? []);

  const hasTop = topArticles.length > 0;

  return (
    <section className="bg-white pt-6">
      <div className="max-w-container mx-auto px-6">
        <div
          className={`grid gap-5 ${
            hasTop
              ? "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)]"
              : secondaryArticles.length > 0
              ? "md:grid-cols-[2fr_1fr]"
              : "grid-cols-1"
          }`}
        >
          {/* Lead card with full overlay */}
          <Link
            href={href}
            className="group relative block overflow-hidden bg-surface-2 aspect-[16/9] md:aspect-auto md:min-h-[420px]"
          >
            {article.featured_image_url ? (
              <Image
                src={article.featured_image_url}
                alt={article.title_tr ?? ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a2351,#143063)]" />
            )}
            {/* Dark overlay gradient */}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,35,81,0.92)_0%,rgba(10,35,81,0.55)_50%,rgba(10,35,81,0.05)_90%)]" />
            {/* Text content */}
            <div className="absolute bottom-0 left-0 right-0 px-8 pb-7 pt-4">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-[6px] h-[6px] rounded-full bg-amber shrink-0" />
                <span className="text-[11px] font-black tracking-[0.1em] uppercase text-amber">
                  {formatDateShort(article.published_at)}
                  {category ? ` • ${category.toUpperCase()}` : ""}
                </span>
              </div>
              <h1 className="text-[30px] font-black leading-[1.12] tracking-[-0.022em] text-white mb-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                {article.title_tr}
              </h1>
              {article.excerpt_tr && (
                <p className="text-sm leading-[1.55] text-white/85 line-clamp-2 max-w-2xl">
                  {article.excerpt_tr}
                </p>
              )}
            </div>
          </Link>

          {/* Secondary cards */}
          {secondaryArticles.length > 0 && (
            <div className="flex flex-col gap-4 h-full">
              {secondaryArticles.slice(0, 2).map((sec) => (
                <Link
                  key={sec.id}
                  href={`/haber/${sec.slug}`}
                  className="group flex flex-col flex-1 overflow-hidden border border-outline-variant bg-surface hover:border-border-strong transition-[border-color] duration-[120ms]"
                >
                  {/* Image top */}
                  <div className="relative flex-1 overflow-hidden bg-surface-2">
                    {sec.featured_image_url ? (
                      <Image
                        src={sec.featured_image_url}
                        alt={sec.title_tr ?? ""}
                        fill
                        sizes="25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#143063,#1e6fb8)]" />
                    )}
                  </div>
                  {/* Title bottom */}
                  <div className="px-4 py-3 shrink-0">
                    <h2 className="text-[14px] font-black leading-[1.28] tracking-tight text-navy line-clamp-2 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                      {sec.title_tr}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* EN ÇOK OKUNANLAR sidebar */}
          {hasTop && (
            <div className="flex flex-col">
              {/* Eyebrow */}
              <div className="border-t-2 border-primary mb-3" />
              <div className="text-[13px] font-black tracking-[0.1em] uppercase text-navy mb-3.5">
                EN ÇOK OKUNANLAR
              </div>

              {/* Ranked list */}
              <ol className="flex flex-col divide-y divide-outline-variant">
                {topArticles.slice(0, 5).map((top, idx) => {
                  const topCategory = resolveCategory(top.nav_tab_slug, top.sector_slugs ?? []);
                  return (
                    <li key={top.id}>
                      <Link
                        href={`/haber/${top.slug}`}
                        className="group flex items-start gap-3 py-3"
                      >
                        <span className="text-[13px] font-bold tabular-nums leading-[1.4] tracking-[0.04em] text-fg-3 shrink-0 min-w-[18px] pt-px">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
                            <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-fg-3 truncate">
                              {topCategory ?? formatDateShort(top.published_at)}
                            </span>
                          </div>
                          <h3 className="text-[14px] font-bold leading-[1.3] tracking-[-0.005em] text-on-surface line-clamp-3 group-hover:underline group-hover:underline-offset-[3px] group-hover:decoration-[1px]">
                            {top.title_tr}
                          </h3>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
