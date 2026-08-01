import type { Metadata } from "next";
import RegionListing, { regionMetadata, regionSlugs } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// Pagination lives at ./sayfa/[n].
export const revalidate = 1800;

export function generateStaticParams() {
  return regionSlugs();
}

export function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return regionMetadata(params.slug, 1);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <RegionListing slug={params.slug} page={1} />;
}
