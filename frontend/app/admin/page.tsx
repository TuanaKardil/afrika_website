import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Dashboard" };
export const revalidate = 300;

interface TopArticle {
  title_tr: string | null;
  slug: string;
  view_count: number;
  published_at: string;
}

interface ScrapeStatRow {
  run_date: string;
  source: string;
  run_slot: string;
  total_scraped: number;
  published: number;
  avg_score: number | null;
}

async function getStats() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [totalRes, todayRes, topRes, scrapeRes] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("is_suppressed", false),
    supabase.from("articles").select("id", { count: "exact", head: true })
      .gte("published_at", new Date(Date.now() - 86400000).toISOString()),
    supabase.from("articles").select("title_tr,slug,view_count,published_at")
      .order("view_count", { ascending: false }).limit(10),
    supabase.from("scrape_stats").select("*").order("run_date", { ascending: false }).limit(10),
  ]);

  return {
    total: totalRes.count ?? 0,
    today: todayRes.count ?? 0,
    topArticles: (topRes.data ?? []) as TopArticle[],
    scrapeStats: (scrapeRes.data ?? []) as ScrapeStatRow[],
  };
}

export default async function AdminDashboard() {
  const { total, today, topArticles, scrapeStats } = await getStats();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Toplam Haber</p>
          <p className="text-4xl font-bold text-white">{total.toLocaleString("tr")}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Son 24 Saat</p>
          <p className="text-4xl font-bold text-amber">{today}</p>
        </div>
      </div>

      {/* Top articles */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">En Çok Okunan Haberler</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {topArticles.map((a, i) => (
            <div key={a.slug} className="px-6 py-3 flex items-center gap-4">
              <span className="text-gray-600 text-sm w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <a
                  href={`/haber/${a.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-gray-200 hover:text-white truncate block"
                >
                  {a.title_tr}
                </a>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(a.published_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <span className="text-sm font-medium text-amber shrink-0">{a.view_count.toLocaleString("tr")} görüntülenme</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrape stats */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Son Scrape Çalışmaları</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tarih</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Slot</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Kaynak</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Çekilen</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Yayınlanan</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Ort. Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {scrapeStats.map((s) => (
                <tr key={`${s.run_date}-${s.source}-${s.run_slot}`} className="hover:bg-gray-800/40">
                  <td className="px-6 py-3 text-gray-300">{s.run_date}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.run_slot === "sabah" ? "bg-blue-900/50 text-blue-300" : "bg-orange-900/50 text-orange-300"}`}>
                      {s.run_slot}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-300">{s.source}</td>
                  <td className="px-6 py-3 text-right text-gray-300">{s.total_scraped}</td>
                  <td className="px-6 py-3 text-right text-green-400 font-medium">{s.published}</td>
                  <td className="px-6 py-3 text-right text-gray-300">{s.avg_score?.toFixed(1) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
