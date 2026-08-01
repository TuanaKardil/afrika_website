import type { Metadata } from "next";
import CountryListing, { countryMetadata, countrySlugs } from "../listing";

// Replaces the old "/ulkeler?ulke=<slug>": a closed set of 54 countries, so it
// belongs in the path and every one of them prerenders. The nav menu links to
// all 54, which is what made the query-param version so costly.
export const revalidate = 1800;

export function generateStaticParams() {
  return countrySlugs();
}

export function generateMetadata(
  { params }: { params: { ulke: string } }
): Promise<Metadata> {
  return countryMetadata(params.ulke, 1);
}

export default function Page({ params }: { params: { ulke: string } }) {
  return <CountryListing slug={params.ulke} page={1} />;
}
