import type { Metadata } from "next";
import AuthorListing, { authorMetadata, authorSlugs } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// Pagination lives at ./sayfa/[n].
export const revalidate = 1800;

export function generateStaticParams() {
  return authorSlugs();
}

export function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  return authorMetadata(params.slug, 1);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <AuthorListing slug={params.slug} page={1} />;
}
