import type { Metadata } from "next";
import Link from "next/link";
import { getAuthors, getHeadlinesByAuthor } from "@/lib/queries/authors";
import { canonicalMeta } from "@/lib/seo";
import { formatDateShort } from "@/lib/utils";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Yazarlar",
  description:
    "Afrika Haberleri yazar kadrosu. Bölge masalarımızdan muhabir ve editörler, kıtanın ekonomi, ticaret ve yatırım gündemini Türkçe takip ediyor.",
  ...canonicalMeta("/yazarlar"),
};

export default async function YazarlarPage() {
  const [authors, headlines] = await Promise.all([
    getAuthors(),
    getHeadlinesByAuthor(3),
  ]);

  return (
    <main className="max-w-container mx-auto px-4 md:px-6 py-8 md:py-12">
      <Breadcrumb items={[{ name: "Yazarlar", href: "/yazarlar" }]} />
      <div className="border-t-2 border-primary mb-3" />

      <header className="mb-10 md:mb-14 max-w-2xl">
        <h1 className="font-headline text-2xl md:text-3xl font-black text-navy mb-2">
          Yazarlar
        </h1>
        <p className="font-body text-sm md:text-base text-on-surface/60 leading-relaxed">
          Bölge masalarımızdan muhabir ve editörler, kıtanın ekonomi, ticaret ve
          yatırım gündemini takip ediyor.
        </p>
      </header>

      {/* Flex rather than grid so the odd card out centres itself. The roster is
          seven writers, so a 2-up grid strands the last one alone on the left
          with a column of dead space beside it; justify-center puts it in the
          middle of its row instead.
          One column until lg: the card carries a bio plus three headlines, and
          at md a 2-up layout wrapped those headlines to two words per line. */}
      <div className="flex flex-wrap justify-center gap-5 md:gap-6">
        {authors.map((author) => {
          const recent = headlines[author.slug] ?? [];
          return (
            <article
              key={author.slug}
              className="w-full lg:w-[calc(50%-0.75rem)] border border-outline-variant p-6 md:p-8 transition-colors hover:border-primary"
            >
              <div className="flex items-baseline justify-between gap-4 mb-1.5">
                <h2 className="font-headline text-lg md:text-xl font-black text-navy leading-tight">
                  <Link
                    href={`/yazarlar/${author.slug}`}
                    className="hover:underline underline-offset-4 decoration-primary decoration-2"
                  >
                    {author.name}
                  </Link>
                </h2>
                {author.region_label_tr && (
                  <span className="shrink-0 font-body text-[10px] md:text-[11px] font-semibold tracking-[0.08em] uppercase text-primary">
                    {author.region_label_tr}
                  </span>
                )}
              </div>

              <p className="font-body text-sm text-on-surface/60 leading-relaxed line-clamp-2 mb-7">
                {author.bio_tr}
              </p>

              {recent.length > 0 && (
                <>
                  <p className="font-body text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface/40 mb-3.5">
                    En Son Haberleri
                  </p>
                  <ul className="space-y-4">
                    {recent.map((article) => (
                      <li key={article.slug} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-[7px] w-[5px] h-[5px] rounded-full bg-amber shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/haber/${article.slug}`}
                            className="font-headline text-[13px] md:text-sm font-bold text-navy leading-snug hover:underline underline-offset-2 line-clamp-2"
                          >
                            {article.title_tr}
                          </Link>
                          <span className="block font-body text-[11px] text-on-surface/40 mt-1">
                            {formatDateShort(article.published_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Link
                href={`/yazarlar/${author.slug}`}
                className="inline-block mt-7 font-body text-xs font-semibold text-primary hover:text-primary-dark"
              >
                Tüm haberleri &rarr;
              </Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
