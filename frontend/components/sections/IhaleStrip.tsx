import Link from "next/link";
import { getTenders, getTenderStats } from "@/lib/queries/tenders";

const CATEGORY_LABELS: Record<string, string> = {
  "altyapi": "ALTYAPI",
  "enerji": "ENERJİ",
  "insaat": "İNŞAAT",
  "hizmet-alimi": "HİZMET",
  "mal-alimi": "MAL ALIMI",
  "yapim-isi": "YAPIM",
  "danismanlik": "DANIŞMANLIK",
  "tarim": "TARIM",
  "saglik": "SAĞLIK",
  "teknoloji": "TEKNOLOJİ",
  "lojistik": "LOJİSTİK",
  "diger": "DİĞER",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function IhaleStrip() {
  const [stats, { tenders }] = await Promise.all([
    getTenderStats(),
    getTenders(1, { status: "active" }),
  ]);

  const featured = tenders.slice(0, 3);

  return (
    <section className="max-w-container mx-auto px-6 pt-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-[18px]">
        <div className="flex-1">
          <div className="border-t-2 border-primary mb-3" />
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-[0.08em] text-navy uppercase">
              İHALELER & FIRSATLAR
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-down uppercase">
              <span className="w-[6px] h-[6px] rounded-full bg-down" style={{ animation: "ah-pulse 1.4s ease-in-out infinite" }} />
              CANLI
            </span>
          </div>
        </div>
        <Link
          href="/ihaleler"
          className="text-xs font-bold tracking-[0.06em] text-primary uppercase hover:underline hover:underline-offset-[3px]"
        >
          TÜM İHALELER &rarr;
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 bg-navy text-white mb-4">
        <div className="px-6 py-5 border-r border-white/[0.12]">
          <div className="text-[28px] font-black tracking-tight tabular-nums">{stats.active}</div>
          <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/65 mt-1">
            Aktif İhale
          </div>
        </div>
        <div className="px-6 py-5 border-r border-white/[0.12]">
          <div className="text-[28px] font-black tracking-tight tabular-nums">{stats.addedThisWeek}</div>
          <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/65 mt-1">
            Bu Hafta Eklenen
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="text-[28px] font-black tracking-tight tabular-nums">{stats.expiringIn7Days}</div>
          <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/65 mt-1">
            7 Günde Bitiyor
          </div>
        </div>
      </div>

      {/* Tender rows */}
      {featured.length > 0 && (
        <div className="border border-outline-variant">
          {featured.map((t, i) => {
            const days = daysUntil(t.deadline_at);
            const catLabel = t.category_slug
              ? (CATEGORY_LABELS[t.category_slug] ?? t.category_slug.toUpperCase())
              : "";
            const budgetM = t.budget_usd
              ? t.budget_usd >= 1_000_000
                ? `$${(t.budget_usd / 1_000_000).toFixed(0)}M`
                : `$${(t.budget_usd / 1_000).toFixed(0)}K`
              : null;

            return (
              <Link
                key={t.id}
                href={`/ihaleler/${t.slug}`}
                className={`grid items-center gap-[18px] px-[18px] py-[14px] no-underline text-on-surface hover:bg-surface-2 transition-colors duration-[120ms] ${
                  i < featured.length - 1 ? "border-b border-outline-variant" : ""
                }`}
                style={{ gridTemplateColumns: "120px 1fr 110px 130px" }}
              >
                <div className="text-[11px] font-black tracking-[0.08em] text-navy border-l-[3px] border-amber pl-2.5 uppercase truncate">
                  {t.country ?? ""}
                </div>
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.08em] text-fg-3 mb-0.5 uppercase">
                    {catLabel}
                  </div>
                  <div className="text-sm font-bold tracking-tight line-clamp-1">{t.title_tr ?? ""}</div>
                </div>
                <div className="text-base font-black text-up text-right tabular-nums">
                  {budgetM ?? ""}
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-semibold tracking-[0.08em] text-fg-3 uppercase">
                    SON BAŞVURU
                  </div>
                  <div className="text-[13px] font-black text-down tabular-nums">
                    {days !== null
                      ? `${days} GÜN`
                      : t.deadline_at
                      ? new Date(t.deadline_at).toLocaleDateString("tr-TR", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
