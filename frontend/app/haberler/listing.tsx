import type { Metadata } from "next";
import Link from "next/link";
import { getFilteredArticles, PAGE_SIZE } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

/**
 * Shared body for /haberler and /haberler/sayfa/[n].
 *
 * The page used to filter through "?bolge=" and "?kategori=", which made the
 * route dynamic and cost it ISR. Every one of those filters already has a
 * static, indexed route of its own, so the pills now link there instead of
 * re-querying here: /haberler stays the unfiltered index and prerenders.
 */
const REGIONS = [
  { slug: "afrika", label: "Tüm Afrika", href: "/haberler" },
  { slug: "kuzey-afrika", label: "Kuzey Afrika", href: "/bolge/kuzey-afrika" },
  { slug: "bati-afrika", label: "Batı Afrika", href: "/bolge/bati-afrika" },
  { slug: "orta-afrika", label: "Orta Afrika", href: "/bolge/orta-afrika" },
  { slug: "dogu-afrika", label: "Doğu Afrika", href: "/bolge/dogu-afrika" },
  { slug: "guney-afrika", label: "Güney Afrika", href: "/bolge/guney-afrika" },
];

const CATEGORIES = [
  { slug: "firsatlar", label: "Fırsatlar", href: "/firsatlar" },
  { slug: "pazarlar-ekonomi", label: "Pazarlar & Ekonomi", href: "/pazarlar-ekonomi" },
  { slug: "ticaret-ihracat", label: "Ticaret & İhracat", href: "/ticaret-ihracat" },
  { slug: "sektorler", label: "Sektörler", href: "/sektorler" },
  { slug: "ulkeler", label: "Ülkeler", href: "/ulkeler" },
  { slug: "diger", label: "Diğer", href: "/diger" },
];

const PILL_BASE =
  "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors";
const PILL_ACTIVE = "bg-primary text-white border-primary";
const PILL_IDLE =
  "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary";

export async function haberlerMetadata(page: number): Promise<Metadata> {
  return {
    title: titleWithPage("Son Dakika Afrika Haberleri", page),
    description:
      "Afrika'dan tüm son dakika haberleri. Bölge ve kategori filtresiyle arama yapın.",
    ...canonicalMeta(paginatedPath("/haberler", page)),
    ...paginatedRobots(page),
  };
}

export async function haberlerPageParams() {
  const { count } = await getFilteredArticles(1, null, null);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export default async function HaberlerListing({ page }: { page: number }) {
  const { articles, count } = await getFilteredArticles(page, null, null);

  return (
    <main className="max-w-container mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-headline text-3xl text-on-surface mb-1">
          Son Dakika Afrika Haberleri
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50">{count} haber</p>
        )}
      </div>

      <div className="mb-8 space-y-5">
        <div>
          <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2.5">
            Bölge
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Link
                key={r.slug}
                href={r.href}
                className={`${PILL_BASE} ${r.slug === "afrika" ? PILL_ACTIVE : PILL_IDLE}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface/40 uppercase mb-2.5">
            Kategori
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/haberler" className={`${PILL_BASE} ${PILL_ACTIVE}`}>
              Tümü
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={c.href} className={`${PILL_BASE} ${PILL_IDLE}`}>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ArticleGrid articles={articles} eyebrow="HABERLER" />
      <Pagination page={page} total={count} basePath="/haberler" />
    </main>
  );
}
