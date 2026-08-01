import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthors, getAuthorBySlug } from "@/lib/queries/authors";
import { getArticlesByAuthor, PAGE_SIZE } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

const SITE_URL = "https://www.afrikahaberleri.tr";

/** Shared body for /yazarlar/[slug] and /yazarlar/[slug]/sayfa/[n]. */
export async function authorMetadata(slug: string, page: number): Promise<Metadata> {
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  return {
    title: titleWithPage(`${author.name}, ${author.role_tr}`, page),
    description: author.bio_tr,
    ...canonicalMeta(paginatedPath(`/yazarlar/${slug}`, page)),
    ...paginatedRobots(page),
  };
}

export async function authorSlugs() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function authorPageParams() {
  const authors = await getAuthors();
  const params: { slug: string; n: string }[] = [];
  for (const author of authors) {
    const { count } = await getArticlesByAuthor(author.slug, 1);
    const totalPages = Math.ceil(count / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) params.push({ slug: author.slug, n: String(p) });
  }
  return params;
}

export default async function AuthorListing({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const { articles, count } = await getArticlesByAuthor(slug, page);
  const basePath = `/yazarlar/${slug}`;

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": author.name,
      "jobTitle": author.role_tr,
      "description": author.bio_tr,
      "url": `${SITE_URL}/yazarlar/${slug}`,
      "worksFor": {
        "@type": "Organization",
        "name": "Afrika Haberleri",
        "url": SITE_URL,
      },
    },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />
      <Breadcrumb
        items={[
          { name: "Yazarlar", href: "/yazarlar" },
          { name: author.name, href: basePath },
        ]}
      />

      <header className="mb-10 md:mb-12 max-w-3xl">
        {author.region_label_tr && (
          <p className="font-body text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-2">
            {author.region_label_tr}
          </p>
        )}
        <h1 className="font-headline text-3xl md:text-4xl font-black text-navy leading-tight">
          {author.name}
        </h1>
        <p className="font-body text-on-surface/70 mt-4 leading-[1.75] max-w-2xl">
          {author.bio_tr}
        </p>
        <p className="font-body text-xs text-on-surface/40 mt-4">{count} haber</p>
      </header>

      <ArticleGrid articles={articles} eyebrow="En Son Haberleri" />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
