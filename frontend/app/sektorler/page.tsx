import type { Metadata } from "next";
import SectorsIndex, { sectorsIndexMetadata } from "./listing";

// No searchParams in this file: that is what lets the route prerender.
export const revalidate = 1800;

export function generateMetadata(): Promise<Metadata> {
  return sectorsIndexMetadata(1);
}

export default function Page() {
  return <SectorsIndex page={1} />;
}
