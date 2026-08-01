import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import HomeBody from "../../home-body";

export const revalidate = 1800;
export const dynamicParams = true;

const HOME_DESCRIPTION = "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için seçilmiş güncel haberlerle takip edin. Haberleri incele.";

export function generateMetadata({ params }: { params: { n: string } }): Metadata {
  const page = parsePageSegment(params.n);
  if (!page) return {};
  // Paginated home variants stay out of the index: they are a rotating slice of
  // articles that are each already indexable via their own URL and via
  // /haberler. `follow` keeps the crawl path intact (CLAUDE.md rule 23).
  return {
    title: { absolute: `Afrika Haberleri | Sayfa ${page}` },
    description: HOME_DESCRIPTION,
    robots: { index: false, follow: true },
  };
}

export default function Page({ params }: { params: { n: string } }) {
  const page = parsePageSegment(params.n);
  // /sayfa/1 and junk segments 404; page 1 is "/" and stays canonical.
  if (!page) notFound();
  return <HomeBody page={page} />;
}
