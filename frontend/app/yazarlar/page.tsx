import type { Metadata } from "next";
import Link from "next/link";
import { getAuthors } from "@/lib/queries/authors";
import { canonicalMeta } from "@/lib/seo";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Yazarlar",
  description:
    "Afrika Haberleri yazar kadrosu. Bölge masalarımızdan muhabir ve editörler, kıtanın ekonomi, ticaret ve yatırım gündemini Türkçe takip ediyor.",
  ...canonicalMeta("/yazarlar"),
};

export default async function YazarlarPage() {
  const authors = await getAuthors();

  return (
    <main className="max-w-container mx-auto px-4 md:px-6 py-8">
      <Breadcrumb items={[{ name: "Yazarlar", href: "/yazarlar" }]} />
      <div className="border-t-2 border-primary mb-3" />
      <h1 className="font-headline text-2xl md:text-3xl font-black text-navy mb-1">
        Yazarlar
      </h1>
      <p className="font-body text-sm text-on-surface/50 mb-8">
        Bölge masalarımızdan muhabir ve editörler
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {authors.map((author) => (
          <Link
            key={author.slug}
            href={`/yazarlar/${author.slug}`}
            className="block rounded-xl border border-outline-variant p-5 hover:border-primary hover:shadow-sm transition-colors"
          >
            <h2 className="font-headline text-lg font-bold text-navy">
              {author.name}
            </h2>
            <p className="font-body text-sm text-primary mb-2">{author.role_tr}</p>
            <p className="font-body text-sm text-on-surface/60 line-clamp-3">
              {author.bio_tr}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
