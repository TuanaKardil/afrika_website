import type { Metadata } from "next";
import Link from "next/link";
import {
  getArticlesByNavTab,
  getArticlesByCountry,
  COUNTRY_SLUG_TO_HASHTAG,
} from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

interface UlkelerPageProps {
  searchParams: { sayfa?: string; ulke?: string };
}

export async function generateMetadata({
  searchParams,
}: UlkelerPageProps): Promise<Metadata> {
  const slug = searchParams.ulke;
  const hashtag = slug ? COUNTRY_SLUG_TO_HASHTAG[slug] : null;
  const page = parsePageParam(searchParams.sayfa);
  const seo = canonicalMeta("/ulkeler", {
    ulke: hashtag ? slug : null,
    sayfa: String(page),
  });
  if (hashtag) {
    return {
      title: titleWithPage(`Son Dakika ${hashtag} Haberleri`, page),
      description: `${hashtag} ile ilgili güncel Afrika haberleri. Ekonomi, ticaret ve yatırım gelişmeleri.`,
      ...seo,    };
  }
  return {
    title: titleWithPage("Afrika Ülke Haberleri", page),
    description: "Afrika ülkelerinden son dakika haberleri. Ülke bazında ekonomi, ticaret ve siyasi gelişmeleri takip edin.",
    ...seo,  };
}

export default async function UlkelerPage({ searchParams }: UlkelerPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const ulkeSlug = searchParams.ulke ?? null;
  const hashtag = ulkeSlug ? (COUNTRY_SLUG_TO_HASHTAG[ulkeSlug] ?? null) : null;

  const { articles, count } = hashtag
    ? await getArticlesByCountry(hashtag, page)
    : await getArticlesByNavTab("ulkeler", page);

  const basePath = hashtag ? `/ulkeler?ulke=${ulkeSlug}` : "/ulkeler";
  const heading = hashtag ? `Son Dakika ${hashtag} Haberleri` : "Afrika Ülke Haberleri";

  return (
    <main className="max-w-container mx-auto px-6 py-8">
      <Breadcrumb items={[{ name: "Ülkeler", href: "/ulkeler" }]} />
      <header className="mb-6">
        {hashtag && (
          <div className="mb-3">
            <Link
              href="/ulkeler"
              className="text-xs font-bold text-primary hover:underline hover:underline-offset-[3px] tracking-[0.04em]"
            >
              &larr; Tüm Ülkeler
            </Link>
          </div>
        )}
        <h1 className="text-3xl font-black text-navy tracking-tight">{heading}</h1>
        {count > 0 && (
          <p className="text-sm text-fg-3 mt-1">{count} haber</p>
        )}
        {hashtag && count === 0 && (
          <p className="text-sm text-fg-3 mt-2">
            {hashtag} için henüz haber bulunamadı.
          </p>
        )}
      </header>
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
