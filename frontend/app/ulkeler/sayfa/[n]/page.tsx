import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import CountryListing, { countryMetadata, countryIndexPageParams } from "../../listing";

export const revalidate = 1800;
export const dynamicParams = true;

export function generateStaticParams() {
  return countryIndexPageParams();
}

export async function generateMetadata(
  { params }: { params: { n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? countryMetadata(null, page) : {};
}

export default function Page({ params }: { params: { n: string } }) {
  const page = parsePageSegment(params.n);
  if (!page) notFound();
  return <CountryListing slug={null} page={page} />;
}
