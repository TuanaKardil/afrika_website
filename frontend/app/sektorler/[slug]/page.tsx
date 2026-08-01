import type { Metadata } from "next";
import SectorListing, { sectorMetadata, sectorSlugs } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// Pagination lives at ./sayfa/[n].
export const revalidate = 1800;

export function generateStaticParams() {
  return sectorSlugs();
}

export function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return sectorMetadata(params.slug, 1);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SectorListing slug={params.slug} page={1} />;
}
