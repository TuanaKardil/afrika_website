import type { Metadata } from "next";
import HaberlerListing, { haberlerMetadata } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// The bolge/kategori filters now link to their own static routes.
export const revalidate = 1800;

export function generateMetadata(): Promise<Metadata> {
  return haberlerMetadata(1);
}

export default function Page() {
  return <HaberlerListing page={1} />;
}
