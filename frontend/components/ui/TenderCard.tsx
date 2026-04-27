import Link from "next/link";
import type { Tender } from "@/lib/queries/tenders";
import { getTenderStatus } from "@/lib/queries/tenders";
import { formatDateShort } from "@/lib/utils";
import CountdownDisplay from "./CountdownDisplay";

// Lookup map for tender category display names
const CATEGORY_LABELS: Record<string, string> = {
  "mal-alimi": "Mal Alimi",
  "hizmet-alimi": "Hizmet Alimi",
  "yapim-isi": "Yapim Isi",
  "danismanlik": "Danismanlik",
  "arastirma-gelistirme": "Arastirma & Gelistirme",
  "altyapi": "Altyapi",
  "enerji": "Enerji",
  "savunma": "Savunma",
  "tarim": "Tarim",
  "saglik": "Saglik",
  "egitim": "Egitim",
  "teknoloji": "Teknoloji",
  "insaat": "Insaat",
  "lojistik": "Lojistik",
  "cevre": "Cevre",
  "diger": "Diger",
};

// Map ISO 3166-1 alpha-2 country codes to Unicode flag emojis
const COUNTRY_FLAG: Record<string, string> = {
  DZ: "DZ", EG: "EG", LY: "LY", MA: "MA", SD: "SD", TN: "TN", MR: "MR",
  BJ: "BJ", BF: "BF", CV: "CV", CI: "CI", GM: "GM", GH: "GH", GN: "GN",
  GW: "GW", LR: "LR", ML: "ML", MR2: "MR", NE: "NE", NG: "NG", SL: "SL",
  SN: "SN", TG: "TG",
  BI: "BI", DJ: "DJ", ER: "ER", ET: "ET", KE: "KE", KM: "KM", MG: "MG",
  MU: "MU", MW: "MW", MZ: "MZ", RW: "RW", SC: "SC", SO: "SO", SS: "SS",
  TZ: "TZ", UG: "UG",
  AO: "AO", CD: "CD", CF: "CF", CG: "CG", CM: "CM", GA: "GA", GQ: "GQ",
  ST: "ST", TD: "TD",
  BW: "BW", LS: "LS", NA: "NA", SZ: "SZ", ZA: "ZA", ZM: "ZM", ZW: "ZW",
};

// Convert ISO 3166-1 alpha-2 code to Unicode flag emoji
function isoToFlagEmoji(countryCode: string): string {
  const upper = countryCode.toUpperCase();
  if (upper.length !== 2) return "";
  const points = Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

// Common African country name to ISO code mapping (Turkish names)
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "misir": "EG", "fas": "MA", "cezayir": "DZ", "tunus": "TN", "libya": "LY",
  "sudan": "SD", "moritanya": "MR", "nijerya": "NG", "gana": "GH", "senegal": "SN",
  "fildisi sahili": "CI", "mali": "ML", "burkina faso": "BF", "benin": "BJ",
  "togo": "TG", "gine": "GN", "sierra leone": "SL", "liberya": "LR",
  "gambiya": "GM", "gine-bissau": "GW", "yesil burun adalari": "CV", "nijer": "NE",
  "kenya": "KE", "etiyopya": "ET", "tanzanya": "TZ", "uganda": "UG",
  "ruanda": "RW", "burundi": "BI", "somali": "SO", "cibuti": "DJ",
  "eritre": "ER", "guney sudan": "SS", "komorlar": "KM", "seysel": "SC",
  "madagaskar": "MG", "mauritius": "MU", "dr kongo": "CD", "kongo": "CG",
  "kamerun": "CM", "cad": "TD", "orta afrika": "CF", "gabon": "GA",
  "ekvator ginesi": "GQ", "sao tome": "ST", "angola": "AO",
  "guney afrika": "ZA", "zimbabve": "ZW", "botsvana": "BW", "namibya": "NA",
  "mozambik": "MZ", "zambiya": "ZM", "malavi": "MW", "lesoto": "LS",
  "esvatini": "SZ",
};

function getFlagForCountry(countryTr: string | null): string {
  if (!countryTr) return "";
  const key = countryTr.toLowerCase().trim();
  const iso = COUNTRY_NAME_TO_ISO[key];
  if (iso) return isoToFlagEmoji(iso);
  // Try matching COUNTRY_FLAG keys (English ISO codes)
  const upperKey = countryTr.toUpperCase();
  if (COUNTRY_FLAG[upperKey]) return isoToFlagEmoji(upperKey);
  return "";
}

function formatBudget(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}Mr`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString("tr-TR")}`;
}

function getDeadlineProgress(tender: Tender): number {
  if (!tender.deadline_at) return 0;
  const deadlineMs = new Date(tender.deadline_at).getTime();
  const publishedMs = tender.published_at
    ? new Date(tender.published_at).getTime()
    : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const totalDuration = deadlineMs - publishedMs;
  if (totalDuration <= 0) return 100;
  const elapsed = Date.now() - publishedMs;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

function progressBarColor(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct > 60) return "bg-amber-500";
  return "bg-green-500";
}

interface StatusBadgeProps {
  status: "active" | "planned" | "expired";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const map = {
    active: { label: "Aktif", classes: "bg-green-100 text-green-700" },
    planned: { label: "Planlandı", classes: "bg-amber-100 text-amber-700" },
    expired: { label: "Süresi Doldu", classes: "bg-red-100 text-red-600" },
  };
  const { label, classes } = map[status];
  return (
    <span className={`inline-block font-body text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

interface TenderCardProps {
  tender: Tender;
  categoryNameTr?: string;
}

export default function TenderCard({ tender, categoryNameTr }: TenderCardProps) {
  const href = `/ihaleler/${tender.slug}`;
  const status = getTenderStatus(tender);
  const progress = getDeadlineProgress(tender);
  const flag = getFlagForCountry(tender.country_tr);

  const categoryLabel =
    categoryNameTr ??
    (tender.category_slug ? (CATEGORY_LABELS[tender.category_slug] ?? tender.category_slug) : null);

  return (
    <article className="group flex flex-col rounded-xl shadow-card bg-surface-container overflow-hidden hover:scale-[1.02] hover:shadow-lg transition-all duration-250">
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Top row: status badge + category chip */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {categoryLabel && (
            <span className="inline-block font-body text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {categoryLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={href}>
          <h2 className="font-headline text-lg leading-snug text-on-surface line-clamp-2 hover:text-primary transition-colors">
            {tender.title_tr ?? tender.title_original}
          </h2>
        </Link>

        {/* Institution */}
        {tender.institution_tr && (
          <p className="font-body text-sm text-on-surface/70 line-clamp-1">
            {tender.institution_tr}
          </p>
        )}

        {/* Reference number */}
        {tender.reference_number && (
          <span className="font-mono text-xs text-on-surface/40">
            {tender.reference_number}
          </span>
        )}

        {/* Country */}
        {tender.country_tr && (
          <span className="font-body text-sm text-on-surface/60">
            {flag ? `${flag} ` : ""}{tender.country_tr}
          </span>
        )}

        {/* Deadline progress bar */}
        {tender.deadline_at && status !== "expired" && (
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressBarColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <CountdownDisplay deadline={tender.deadline_at} />
              <span className="font-body text-[10px] text-on-surface/40">{progress}%</span>
            </div>
          </div>
        )}

        {/* Dates row */}
        <div className="flex flex-wrap items-center gap-3 font-body text-xs text-on-surface/50">
          {tender.published_at && (
            <span>Yayın: {formatDateShort(tender.published_at)}</span>
          )}
          {tender.deadline_at && (
            <span>Son: {formatDateShort(tender.deadline_at)}</span>
          )}
        </div>

        {/* Budget */}
        {tender.budget_usd != null && (
          <span className="font-body text-sm font-semibold text-on-surface/80">
            {formatBudget(tender.budget_usd)}
          </span>
        )}

        {/* Link arrow */}
        <div className="mt-auto pt-2 border-t border-outline-variant flex items-center justify-between">
          <Link
            href={href}
            className="font-body text-sm font-semibold text-primary hover:underline"
          >
            Detaylar
          </Link>
          {tender.source_url && (
            <a
              href={tender.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs text-on-surface/40 hover:text-primary transition-colors"
            >
              Kaynak
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
