import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getArticleBySlug, getSimilarArticles } from "@/lib/queries/articles";
import { sanitizeArticleContent } from "@/lib/sanitize";
import CategoryBadge from "@/components/ui/CategoryBadge";
import RegionBadge from "@/components/ui/RegionBadge";
import ReadingTime from "@/components/ui/ReadingTime";
import ViewCountIncrementer from "./ViewCountIncrementer";
import SaveButton from "@/components/ui/SaveButton";
import SimilarArticlesPanel from "@/components/ui/SimilarArticlesPanel";
import { formatDate } from "@/lib/utils";
import { resolveCategory } from "@/lib/labels";

const SOURCE_LABELS: Record<string, string> = {
  business_insider: "Business Insider Africa",
  cnbc_africa:      "CNBC Africa",
  africa_report:    "The Africa Report",
  aa_africa:        "Anadolu Ajansı",
  the_conversation: "The Conversation",
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
  if (!article || !article.title_tr || article.is_suppressed || (article.score !== null && article.score < 4)) notFound();

  const [safeContent, similarArticles] = await Promise.all([
    Promise.resolve(sanitizeArticleContent(article.content_tr ?? "")),
    getSimilarArticles(
      article.id,
      article.nav_tab_slug,
      article.sector_slugs ?? [],
      article.hashtags ?? []
    ),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ViewCountIncrementer articleId={article.id} />

      {/* ── Başlık bölümü: tam genişlik, sidebar yok ── */}
      <div className="lg:pr-[340px]">
        {/* Breadcrumb */}
        <nav aria-label="Sayfa yolu" className="mb-6 flex items-center gap-2 font-body text-sm text-on-surface/50">
          <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
          <span>/</span>
          {(() => {
            const crumbLabel = article.nav_tab_slug
              ? resolveCategory(article.nav_tab_slug, article.sector_slugs ?? [], article.hashtags)
              : null;
            return crumbLabel ? (
              <>
                <a href={`/${article.nav_tab_slug}`} className="hover:text-primary transition-colors capitalize">
                  {crumbLabel}
                </a>
                <span>/</span>
              </>
            ) : null;
          })()}
          <span className="text-on-surface/30 truncate max-w-[200px]">{article.title_tr}</span>
        </nav>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {article.nav_tab_slug && (
            <CategoryBadge
              slug={article.nav_tab_slug}
              sectorSlugs={article.sector_slugs ?? []}
              hashtags={article.hashtags}
            />
          )}
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
          {article.source && (
            <span className="ml-auto text-on-surface/40">
              Kaynak: {SOURCE_LABELS[article.source] ?? article.source}
            </span>
          )}
        </div>
      </div>

      {/* ── İçerik + sidebar: görsel hizasından başlar ── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 items-start">

        {/* Sol: görsel + makale gövdesi */}
        <article>
          {/* Featured image */}
          {article.featured_image_url && (
            <figure className="mb-8">
              <div className="relative aspect-video rounded-sm overflow-hidden">
                <img
                  src={article.featured_image_url}
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              {article.image_credit && (
                <figcaption className="mt-1.5 font-body text-xs text-on-surface/40 text-right">
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
                <a
                  key={tag}
                  href={`/hashtag/${encodeURIComponent(tag)}`}
                  className="font-body text-xs text-on-surface/60 bg-surface-container px-2.5 py-1 rounded-sm hover:bg-primary/10 hover:text-primary transition-colors duration-[120ms]"
                >
                  {tag}
                </a>
              ))}
            </div>
          )}

          {article.score != null && (
            <p className="mt-6 font-body text-xs text-on-surface/40">
              Afrika alaka puanı: {article.score}/10
            </p>
          )}

          {/* Mobilde benzer haberler makale altında */}
          {similarArticles.length > 0 && (
            <div className="mt-10 lg:hidden">
              <SimilarArticlesPanel articles={similarArticles} />
            </div>
          )}
        </article>

        {/* ── Sağ: benzer haberler sidebar (sadece desktop) ── */}
        {similarArticles.length > 0 && (
          <div className="hidden lg:block sticky top-6">
            <SimilarArticlesPanel articles={similarArticles} />
          </div>
        )}

      </div>
    </div>
  );
}
