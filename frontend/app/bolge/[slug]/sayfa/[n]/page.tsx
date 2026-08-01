import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import RegionListing, { regionMetadata, regionPageParams } from "../../listing";

export const revalidate = 1800;
export const dynamicParams = true;

export function generateStaticParams() {
  return regionPageParams();
}

export async function generateMetadata(
  { params }: { params: { slug: string; n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? regionMetadata(params.slug, page) : {};
}

export default function Page({ params }: { params: { slug: string; n: string } }) {
  const page = parsePageSegment(params.n);
  // /sayfa/1 and junk segments 404; page 1 is the bare path and stays canonical.
  if (!page) notFound();
  return <RegionListing slug={params.slug} page={page} />;
}
