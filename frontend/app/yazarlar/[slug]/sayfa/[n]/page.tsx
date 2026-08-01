import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import AuthorListing, { authorMetadata, authorPageParams } from "../../listing";

export const revalidate = 1800;
export const dynamicParams = true;

export function generateStaticParams() {
  return authorPageParams();
}

export async function generateMetadata(
  { params }: { params: { slug: string; n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? authorMetadata(params.slug, page) : {};
}

export default function Page({ params }: { params: { slug: string; n: string } }) {
  const page = parsePageSegment(params.n);
  if (!page) notFound();
  return <AuthorListing slug={params.slug} page={page} />;
}
