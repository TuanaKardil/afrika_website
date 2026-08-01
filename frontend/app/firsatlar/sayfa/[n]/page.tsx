import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NAV_TAB_LISTINGS } from "@/lib/nav-tab-listings";
import { parsePageSegment } from "@/lib/seo";
import NavTabListing, { navTabMetadata, navTabPageParams } from "@/components/sections/NavTabListing";

export const revalidate = 1800;
// Pages beyond the ones known at build time render on demand, then cache.
export const dynamicParams = true;

const CONFIG = NAV_TAB_LISTINGS["firsatlar"];

export function generateStaticParams() {
  return navTabPageParams(CONFIG);
}

export async function generateMetadata(
  { params }: { params: { n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? navTabMetadata(CONFIG, page) : {};
}

export default function Page({ params }: { params: { n: string } }) {
  const page = parsePageSegment(params.n);
  // /sayfa/1 and junk segments 404; page 1 is the bare path and stays canonical.
  if (!page) notFound();
  return <NavTabListing config={CONFIG} page={page} />;
}
