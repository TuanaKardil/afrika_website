import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getAllSlugs, getArticleBySlug } from "@/lib/queries/articles";
import { sanitizeArticleContent } from "@/lib/sanitize";
import CategoryBadge from "@/components/ui/CategoryBadge";
import RegionBadge from "@/components/ui/RegionBadge";
import ReadingTime from "@/components/ui/ReadingTime";
import ViewCountIncrementer from "./ViewCountIncrementer";
import SaveButton from "@/components/ui/SaveButton";
import { formatDate } from "@/lib/utils";

const SOURCE_NAMES: Record<string, string> = {
  business_insider: "Business Insider Africa",
  cnbc_africa: "CNBC Africa",
  africa_report: "The Africa Report",
  aa_africa: "Anadolu Agency Africa",
  the_conversation: "The Conversation Africa",
};

export const revalidate = 3600;

interface HaberPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: HaberPageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return {};
  return {
    title: article.title_tr ?? article.title_original ?? "",
    description: article.excerpt_tr ?? article.excerpt_original ?? "",
    openGraph: {
      title: article.title_tr ?? undefined,
      description: article.excerpt_tr ?? undefined,
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
  };
}

export default async function HaberPage({ params }: HaberPageProps) {
  const article = await getArticleBySlug(params.slug);
  if (!article || !article.title_tr || article.is_suppressed) notFound();

  const safeContent = sanitizeArticleContent(article.content_tr ?? "");
  const sourceName = SOURCE_NAMES[article.source] ?? article.source;

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <ViewCountIncrementer articleId={article.id} />

      {/* Breadcrumb */}
      <nav aria-label="Sayfa yolu" className="mb-6 flex items-center gap-2 font-body text-sm text-on-surface/50">
        <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
        <span>/</span>
        {article.nav_tab_slug && (
          <>
            <a href={`/${article.nav_tab_slug}`} className="hover:text-primary transition-colors capitalize">
              {article.nav_tab_slug.replace(/-/g, " ")}
            </a>
            <span>/</span>
          </>
        )}
        <span className="text-on-surface/30 truncate max-w-[200px]">{article.title_tr}</span>
      </nav>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {article.nav_tab_slug && <CategoryBadge slug={article.nav_tab_slug} />}
        {article.region_slug && <RegionBadge slug={article.region_slug} />}
      </div>

      {/* Title */}
      <h1 className="font-headline text-3xl md:text-4xl leading-tight text-on-surface mb-4">
        {article.title_tr}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-outline-variant font-body text-sm text-on-surface/60">
        <SaveButton articleId={article.id} />
        {article.author_original && <span>{article.author_original}</span>}
        <time dateTime={article.published_at}>
          {formatDate(article.published_at)}
        </time>
        <ReadingTime minutes={article.reading_time_minutes} />
        <span className="text-on-surface/40">Kaynak: {sourceName}</span>
      </div>

      {/* Featured image */}
      {article.featured_image_url && (
        <figure className="mb-8">
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Image
              src={article.featured_image_url}
              alt={article.title_tr ?? ""}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          {article.image_credit && (
            <figcaption className="mt-2 text-center font-body text-xs text-on-surface/50">
              {article.image_credit}
            </figcaption>
          )}
        </figure>
      )}

      {/* Article body */}
      <div
        className="article-content font-body text-base text-on-surface leading-relaxed"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />

      {/* Hashtags */}
      {article.hashtags && article.hashtags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-outline-variant flex flex-wrap gap-2">
          {article.hashtags.map((tag) => (
            <span
              key={tag}
              className="font-body text-xs text-on-surface/60 bg-surface-container px-2.5 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source link */}
      {article.source_url && (
        <div className="mt-6 pt-6 border-t border-outline-variant">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-primary hover:text-tertiary transition-colors"
          >
            Orijinal haberi oku ({sourceName})
          </a>
        </div>
      )}
    </main>
  );
}
