import type { Metadata } from "next";
import HashtagListing, { hashtagMetadata } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// Pagination lives at ./sayfa/[n].
export const revalidate = 1800;

export function generateMetadata(
  { params }: { params: { tag: string } }
): Promise<Metadata> {
  return hashtagMetadata(params.tag, 1);
}

export default function Page({ params }: { params: { tag: string } }) {
  return <HashtagListing rawTag={params.tag} page={1} />;
}
