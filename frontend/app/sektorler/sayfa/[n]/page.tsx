import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import SectorsIndex, { sectorsIndexMetadata, sectorsIndexPageParams } from "../../listing";

export const revalidate = 1800;
export const dynamicParams = true;

export function generateStaticParams() {
  return sectorsIndexPageParams();
}

export async function generateMetadata(
  { params }: { params: { n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? sectorsIndexMetadata(page) : {};
}

export default function Page({ params }: { params: { n: string } }) {
  const page = parsePageSegment(params.n);
  if (!page) notFound();
  return <SectorsIndex page={page} />;
}
