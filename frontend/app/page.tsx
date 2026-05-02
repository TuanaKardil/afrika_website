import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getLatestArticles,
  getArticlesByNavTab,
  getTopScoredRecent,
} from "@/lib/queries/articles";
import { getNavTabs } from "@/lib/queries/nav_tabs";
import HeroSection from "@/components/sections/HeroSection";
import ArticleGrid from "@/components/sections/ArticleGrid";
import CategoryFilter from "@/components/sections/CategoryFilter";
import Pagination from "@/components/sections/Pagination";
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

  const topScored = page === 1 ? await getTopScoredRecent(8) : [];
  const heroArticle = topScored[0] ?? null;
  const heroSecondary = topScored.slice(1, 3);
  const sidebarArticles = topScored.slice(3, 8);
  const heroIds = topScored.slice(0, 3).map((a) => a.id);

  const [{ articles, count }, navTabs, { articles: firsatlar }] =
    await Promise.all([
      getLatestArticles(page, heroIds),
      getNavTabs(),
      getArticlesByNavTab("firsatlar", 1),
    ]);

  const gridArticles = articles;

  return (
    <>
      {/* Scrolling breaking news ticker */}
      <BreakingTicker />

      {/* Hero: lead card + 2 secondary cards */}
      {heroArticle && (
        <HeroSection
          article={heroArticle}
          secondaryArticles={heroSecondary}
          topArticles={sidebarArticles}
        />
      )}

      {/* Main content */}
      <main className="pb-8">
        {/* Son Haberler */}
        <div className="max-w-container mx-auto px-6 pt-10">
          <CategoryFilter navTabs={navTabs} activeSlug={null} />
          <ArticleGrid articles={gridArticles} eyebrow="SON HABERLER" action="Tümünü Gör" actionHref="/haberler" />
          <Pagination page={page} total={count} basePath="/" />
        </div>

        {/* Tenders strip */}
        <Suspense fallback={null}>
          <IhaleStrip />
        </Suspense>

        {/* Firsatlar section */}
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

      {/* Newsletter */}
      <NewsletterSection />
    </>
  );
}
