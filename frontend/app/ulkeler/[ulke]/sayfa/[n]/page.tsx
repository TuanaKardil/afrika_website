import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import CountryListing, { countryMetadata } from "../../../listing";

export const revalidate = 1800;
// Not prerendered: 54 countries x their page counts is a lot of build time for
// pages that are noindex anyway. They render on first request, then cache.
export const dynamicParams = true;

export async function generateMetadata(
  { params }: { params: { ulke: string; n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? countryMetadata(params.ulke, page) : {};
}

export default function Page({ params }: { params: { ulke: string; n: string } }) {
  const page = parsePageSegment(params.n);
  if (!page) notFound();
  return <CountryListing slug={params.ulke} page={page} />;
}
