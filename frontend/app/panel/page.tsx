import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/lib/auth/actions";
import ArticleGrid from "@/components/sections/ArticleGrid";
import type { Article } from "@/lib/queries/articles";

export const metadata: Metadata = {
  title: "Panelim",
  description: "Kaydedilen haberleriniz ve hesap ayarlariniz.",
};

export default async function PanelPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris?redirect=/panel");

  // Fetch saved articles with joined article data
  const { data: savedRows } = await supabase
    .from("saved_articles")
    .select("saved_at, articles(*)")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const savedArticles: Article[] = (savedRows ?? [])
    .map((row) => {
      const a = (row as { saved_at: string; articles: unknown }).articles;
      return a as Article | null;
    })
    .filter((a): a is Article => a !== null && a.title_tr !== null);

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 pb-6 border-b border-outline-variant">
        <div>
          <h1 className="font-headline text-2xl text-on-surface">Panelim</h1>
          <p className="font-body text-sm text-on-surface/60 mt-1">{user.email}</p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="font-body text-sm font-medium text-on-surface/60 hover:text-primary border border-outline-variant px-4 py-2 rounded-lg hover:border-primary/40 transition-colors"
          >
            Cikis Yap
          </button>
        </form>
      </div>

      {/* Saved articles */}
      <section>
        <h2 className="font-headline text-xl text-on-surface mb-4">
          Kaydedilen Haberler
          {savedArticles.length > 0 && (
            <span className="font-body text-sm text-on-surface/50 font-normal ml-2">
              ({savedArticles.length})
            </span>
          )}
        </h2>

        {savedArticles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-body text-on-surface/50">
              Henuz kaydedilen haber yok.
            </p>
            <a
              href="/"
              className="inline-block mt-4 font-body text-sm font-medium text-primary hover:text-tertiary transition-colors"
            >
              Haberlere Goz At
            </a>
          </div>
        ) : (
          <ArticleGrid articles={savedArticles} />
        )}
      </section>
    </main>
  );
}
