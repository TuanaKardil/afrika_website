import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Blog | Afrika Haberleri",
  description: "Afrika iş dünyası, ekonomi ve güncel gelişmeler hakkında analizler ve yazılar.",
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
}

async function getPosts(): Promise<BlogPost[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,featured_image_url,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);
  return (data as BlogPost[]) ?? [];
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
      <p className="text-gray-500 mb-10 text-sm">Afrika iş dünyası ve ekonomisine dair analizler</p>

      {posts.length === 0 ? (
        <p className="text-gray-500">Henüz yayımlanmış yazı yok.</p>
      ) : (
        <div className="grid gap-8">
          {posts.map(p => (
            <article key={p.id} className="flex gap-6 border-b border-gray-100 pb-8">
              {p.featured_image_url && (
                <Link href={`/blog/${p.slug}`} className="flex-shrink-0">
                  <img src={p.featured_image_url} alt="" className="w-40 h-28 object-cover rounded-lg" />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/blog/${p.slug}`}>
                  <h2 className="text-lg font-bold text-gray-900 hover:text-amber-600 line-clamp-2 mb-2">{p.title}</h2>
                </Link>
                {p.excerpt && <p className="text-gray-500 text-sm line-clamp-2 mb-2">{p.excerpt}</p>}
                <p className="text-xs text-gray-400">{new Date(p.published_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
