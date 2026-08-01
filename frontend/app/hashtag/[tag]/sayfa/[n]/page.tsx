import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePageSegment } from "@/lib/seo";
import HashtagListing, { hashtagMetadata } from "../../listing";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateMetadata(
  { params }: { params: { tag: string; n: string } }
): Promise<Metadata> {
  const page = parsePageSegment(params.n);
  return page ? hashtagMetadata(params.tag, page) : {};
}

export default function Page({ params }: { params: { tag: string; n: string } }) {
  const page = parsePageSegment(params.n);
  if (!page) notFound();
  return <HashtagListing rawTag={params.tag} page={page} />;
}
