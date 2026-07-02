import type { Metadata } from "next";
import { fetchGaOverview } from "@/lib/ga-data";

export const metadata: Metadata = { title: "Analitik" };
export const revalidate = 3600;

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{typeof value === "number" ? value.toLocaleString("tr") : value}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminAnalytics() {
  const data = await fetchGaOverview();

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analitik</h1>
          <p className="text-gray-500 text-xs">Son 7 gün · Her saat güncellenir</p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
        >
          GA4 Paneli ↗
        </a>
      </div>

      {!data ? (
        <div className="bg-red-950 border border-red-900 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">Veri çekilemedi. GA4 erişimi kontrol edilsin.</p>
        </div>
      ) : (
        <>
          {/* Ana metrikler */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Stat label="Aktif Kullanıcı" value={data.activeUsers} sub="son 7 gün" />
            <Stat label="Oturum" value={data.sessions} sub="son 7 gün" />
            <Stat label="Sayfa Görüntülenme" value={data.pageViews} sub="son 7 gün" />
            <Stat label="Ort. Oturum Süresi" value={data.avgSessionDuration} sub="dakika:saniye" />
          </div>

          {/* Günlük kullanıcı grafiği (basit bar) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <p className="text-gray-400 text-sm font-medium mb-4">Günlük Aktif Kullanıcı</p>
            <div className="flex items-end gap-2 h-24">
              {data.dailyUsers.map(d => {
                const max = Math.max(...data.dailyUsers.map(x => x.users), 1);
                const pct = Math.max(4, Math.round((d.users / max) * 100));
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-gray-500 text-xs">{d.users}</span>
                    <div
                      className="w-full bg-amber rounded-sm"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-gray-600 text-xs">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* En çok görüntülenen sayfalar */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm font-medium mb-4">En Çok Görüntülenen Sayfalar</p>
              <div className="space-y-2">
                {data.topPages.map((p, i) => (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                    <span className="text-gray-300 text-xs flex-1 truncate">{p.path}</span>
                    <span className="text-amber text-xs font-medium">{p.views.toLocaleString("tr")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ülkeler */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm font-medium mb-4">Ülkelere Göre Kullanıcı</p>
              <div className="space-y-2">
                {data.topCountries.map((c, i) => (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                    <span className="text-gray-300 text-xs flex-1">{c.country}</span>
                    <span className="text-amber text-xs font-medium">{c.users.toLocaleString("tr")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
