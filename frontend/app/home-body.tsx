import { Suspense } from "react";
import {
  getArticlesByNavTab,
  getTopScoredRecent,
  getTopArticles,
} from "@/lib/queries/articles";
import HeroSection from "@/components/sections/HeroSection";
import ArticleGrid from "@/components/sections/ArticleGrid";
import ArticlesFeed from "@/components/sections/ArticlesFeed";
import BreakingTicker from "@/components/sections/BreakingTicker";

/**
 * Shared body for / and /sayfa/[n].
 *
 * Only the "Son Haberler" feed paginates; the hero and the Fırsatlar strip are
 * the same on every page, which is how the homepage behaved before pagination
 * moved out of the query string.
 */
export default async function HomeBody({ page }: { page: number }) {
  const [topScored, sidebarArticles, { articles: firsatlar }] = await Promise.all([
    getTopScoredRecent(3),
    getTopArticles(5),
    getArticlesByNavTab("firsatlar", 1),
  ]);

  const heroArticle = topScored[0] ?? null;
  const heroSecondary = topScored.slice(1, 3);
  const heroIds = topScored.map((a) => a.id);

  return (
    <>
      <BreakingTicker />

      {heroArticle && (
        <HeroSection
          article={heroArticle}
          secondaryArticles={heroSecondary}
          topArticles={sidebarArticles}
        />
      )}

      <main className="pb-8">
        {/* Son Haberler — Suspense ile sadece bu alan güncellenir */}
        <div className="max-w-container mx-auto px-6 pt-10">
          <Suspense fallback={<ArticlesFeedSkeleton />}>
            <ArticlesFeed page={page} excludeIds={heroIds} />
          </Suspense>
        </div>

        {firsatlar.length > 0 && (
          <div className="max-w-container mx-auto px-6 pt-12">
            <ArticleGrid
              articles={firsatlar.slice(0, 8)}
              eyebrow="AFRİKA YATIRIM FIRSATLARI"
              action="Tümünü Gör"
              actionHref="/firsatlar"
            />
          </div>
        )}
      </main>
    </>
  );
}

function ArticlesFeedSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-t-2 border-primary mb-3" />
      <div className="h-5 w-32 bg-surface-2 rounded mb-5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-2 rounded h-64" />
        ))}
      </div>
    </div>
  );
}
