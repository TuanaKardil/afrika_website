import type { Metadata } from "next";
import { NAV_TAB_LISTINGS } from "@/lib/nav-tab-listings";
import NavTabListing, { navTabMetadata } from "@/components/sections/NavTabListing";

// No searchParams anywhere in this file: that is what lets the route prerender.
// Pagination lives at ./sayfa/[n].
export const revalidate = 1800;

const CONFIG = NAV_TAB_LISTINGS["diger"];

export function generateMetadata(): Promise<Metadata> {
  return navTabMetadata(CONFIG, 1);
}

export default function Page() {
  return <NavTabListing config={CONFIG} page={1} />;
}
