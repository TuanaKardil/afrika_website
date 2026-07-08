import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getArticlesByNavTab,
  getTopScoredRecent,
  getTopArticles,
} from "@/lib/queries/articles";
import { buildCanonical, parsePageParam } from "@/lib/seo";
import HeroSection from "@/components/sections/HeroSection";
import ArticleGrid from "@/components/sections/ArticleGrid";
import ArticlesFeed from "@/components/sections/ArticlesFeed";
import BreakingTicker from "@/components/sections/BreakingTicker";

export const revalidate = 1800;

const HOME_DESCRIPTION = "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için seçilmiş güncel haberlerle takip edin. Haberleri incele.";

interface HomePageProps {
  searchParams: { sayfa?: string };
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  if (page > 1) {
    // Next 14.2 strips the query string from canonical URLs on the root path,
    // so paginated home variants cannot self-canonicalize. The same articles
    // are indexable via /haberler with correct canonicals; keep these out of
    // the index but let crawlers follow the article links.
    return {
      title: { absolute: `Afrika Haberleri | Sayfa ${page}` },
      description: HOME_DESCRIPTION,
      robots: { index: false, follow: true },
    };
  }
  return {
    title: { absolute: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri" },
    description: HOME_DESCRIPTION,
    alternates: { canonical: buildCanonical("/") },
    openGraph: {
      type: "website",
      siteName: "Afrika Haberleri",
      locale: "tr_TR",
      url: "/",
      title: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri",
      description: HOME_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri",
      description: HOME_DESCRIPTION,
    },
  };
}

const SITE_URL = "https://www.afrikahaberleri.tr";

// NewsMediaOrganization + WebSite schema live on the homepage only (Google's
// recommended placement). No SearchAction: the sitelinks search box was
// retired in November 2024. `sameAs` links the brand to its official social
// profiles — add more URLs (X, Instagram, Facebook) here as accounts are created.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  "name": "Afrika Haberleri",
  "url": SITE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${SITE_URL}/icon.png`,
    "width": 512,
    "height": 512,
  },
  "email": "iletisim@afrikahaberleri.tr",
  "sameAs": ["https://www.linkedin.com/company/afrika-haberleri/"],
  "description":
    "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için Türkçe sunan haber platformu.",
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  "url": SITE_URL,
  "name": "Afrika Haberleri",
  "inLanguage": "tr",
  "publisher": { "@id": `${SITE_URL}/#organization` },
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
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
