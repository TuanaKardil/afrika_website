import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthors, getAuthorBySlug } from "@/lib/queries/authors";
import { getArticlesByAuthor } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

const SITE_URL = "https://www.afrikahaberleri.tr";

export const revalidate = 1800;

interface YazarPageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params, searchParams }: YazarPageProps): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author) return {};
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage(`${author.name}, ${author.role_tr}`, page),
    description: author.bio_tr,
    ...canonicalMeta(`/yazarlar/${params.slug}`, { sayfa: String(page) }),
  };
}

export default async function YazarPage({ params, searchParams }: YazarPageProps) {
  const author = await getAuthorBySlug(params.slug);

  if (!author) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByAuthor(params.slug, page);
  const basePath = `/yazarlar/${params.slug}`;

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": author.name,
      "jobTitle": author.role_tr,
      "description": author.bio_tr,
      "url": `${SITE_URL}/yazarlar/${params.slug}`,
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
          { name: author.name, href: `/yazarlar/${params.slug}` },
        ]}
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="font-headline text-3xl font-black text-navy">{author.name}</h1>
        <p className="font-body text-primary mt-1">{author.role_tr}</p>
        {author.region_label_tr && (
          <p className="font-body text-sm text-on-surface/50 mt-0.5">
            Sorumluluk alanı: {author.region_label_tr}
          </p>
        )}
        <p className="font-body text-on-surface/70 mt-4 leading-relaxed">
          {author.bio_tr}
        </p>
      </header>

      <ArticleGrid articles={articles} eyebrow={`${author.name.toUpperCase()} HABERLERİ`} />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
