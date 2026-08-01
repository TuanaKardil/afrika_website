import type { Metadata } from "next";
import CountryListing, { countryMetadata } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
// The country filter is now /ulkeler/[ulke]; pagination is ./sayfa/[n].
export const revalidate = 1800;

export function generateMetadata(): Promise<Metadata> {
  return countryMetadata(null, 1);
}

export default function Page() {
  return <CountryListing slug={null} page={1} />;
}
