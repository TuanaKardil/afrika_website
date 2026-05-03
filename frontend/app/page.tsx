import type { Metadata } from "next";
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
import IhaleStrip from "@/components/sections/IhaleStrip";
import NewsletterSection from "@/components/sections/NewsletterSection";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Afrika Haberleri",
  description: "Afrika'dan son dakika haberleri Türkçe olarak.",
};

interface HomePageProps {
  searchParams: { sayfa?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

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

        <Suspense fallback={null}>
          <IhaleStrip />
        </Suspense>

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

      <NewsletterSection />
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
