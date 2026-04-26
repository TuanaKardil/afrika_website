import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import CategoryBadge from "@/components/ui/CategoryBadge";
import RegionBadge from "@/components/ui/RegionBadge";
import ReadingTime from "@/components/ui/ReadingTime";
import { formatDate } from "@/lib/utils";

interface HeroSectionProps {
  article: Article;
}

export default function HeroSection({ article }: HeroSectionProps) {
  const href = `/haber/${article.slug}`;

  return (
    <section className="bg-surface-container border-b border-outline-variant">
      <div className="container mx-auto px-4 py-8">
        <Link href={href} className="group grid md:grid-cols-2 gap-6 items-center">
          {/* Image */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-outline-variant">
            {article.featured_image_url ? (
              <Image
                src={article.featured_image_url}
                alt={article.title_tr ?? ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-outline-variant" />
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {article.nav_tab_slug && (
                <CategoryBadge slug={article.nav_tab_slug} linkable={false} />
              )}
              {article.region_slug && article.region_slug !== "afrika" && (
                <RegionBadge slug={article.region_slug} linkable={false} />
              )}
            </div>

            <h1 className="font-headline text-3xl md:text-4xl leading-tight text-on-surface group-hover:text-primary transition-colors">
              {article.title_tr}
            </h1>

            {article.excerpt_tr && (
              <p className="font-body text-base text-on-surface/70 leading-relaxed line-clamp-3">
                {article.excerpt_tr}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1">
              {article.author_original && (
                <span className="font-body text-sm text-on-surface/60">
                  {article.author_original}
                </span>
              )}
              <time
                dateTime={article.published_at}
                className="font-body text-sm text-on-surface/50"
              >
                {formatDate(article.published_at)}
              </time>
              <ReadingTime minutes={article.reading_time_minutes} />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
