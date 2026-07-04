import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sanitizeArticleContent } from "@/lib/sanitize";

export const revalidate = 1800;

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title,content,excerpt,featured_image_url,published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data as BlogPost | null);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Bulunamadı" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `/blog/${params.slug}`,
      siteName: "Afrika Haberleri",
      locale: "tr_TR",
      publishedTime: post.published_at,
      images: post.featured_image_url ? [{ url: post.featured_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

const SITE_URL = "https://www.afrikahaberleri.tr";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const safeContent = sanitizeArticleContent(post.content);
  const postUrl = `${SITE_URL}/blog/${params.slug}`;

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    ...(post.excerpt ? { "description": post.excerpt } : {}),
    "datePublished": post.published_at,
    "inLanguage": "tr",
    "url": postUrl,
    "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
    ...(post.featured_image_url
      ? { "image": { "@type": "ImageObject", "url": post.featured_image_url } }
      : {}),
    "author": { "@type": "Organization", "name": "Afrika Haberleri" },
    "publisher": {
      "@type": "Organization",
      "name": "Afrika Haberleri",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/icon.png`,
        "width": 512,
        "height": 512,
      },
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
          <p className="text-sm text-gray-400">
            {new Date(post.published_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        {post.featured_image_url && (
          <figure className="mb-8">
            <img src={post.featured_image_url} alt="" className="w-full rounded-xl object-cover max-h-96" />
          </figure>
        )}

        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </article>
    </main>
  );
}
