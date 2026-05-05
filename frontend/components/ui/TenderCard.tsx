import Link from "next/link";
import type { Tender } from "@/lib/queries/tenders";
import { getTenderStatus } from "@/lib/tender-utils";
import { formatDateShort } from "@/lib/utils";
import TenderFavoriteButton from "./TenderFavoriteButton";

// Map ISO 3166-1 alpha-2 country codes to Unicode flag emojis
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

function isoToFlagEmoji(code: string): string {
  if (code.length !== 2) return "";
  return String.fromCodePoint(...Array.from(code.toUpperCase()).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function getFlagForCountry(countryTr: string | null): string {
  if (!countryTr) return "";
  const iso = COUNTRY_NAME_TO_ISO[countryTr.toLowerCase().trim()];
  return iso ? isoToFlagEmoji(iso) : "";
}

function formatBudget(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}Mr`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString("tr-TR")}`;
}

function hoursUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  return (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
}

function StatusBadge({ status }: { status: "active" | "planned" | "expired" }) {
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

function CategoryBadge({ slug, label }: { slug: string | null; label: string }) {
  // "diger" gets a distinct amber color so it's visually different from real categories
  const isDiger = slug === "diger" || label.toLowerCase() === "diğer" || label.toLowerCase() === "diger";
  return (
    <span
      className={`inline-block font-body text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
        isDiger
          ? "bg-amber-100 text-amber-700"
          : "bg-primary/10 text-primary"
      }`}
    >
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
  const flag = getFlagForCountry(tender.country_tr);
  const hours = status === "active" ? hoursUntilDeadline(tender.deadline_at) : null;
  const isUrgent = hours !== null && hours <= 24;

  const categoryLabel =
    categoryNameTr ??
    (tender.category_slug ? tender.category_slug : null);

  return (
    <article className="group relative flex flex-col rounded-xl shadow-card bg-surface-container overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-col flex-1 p-4 gap-3">

        {/* Top row: badges + favorite button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <StatusBadge status={status} />
            {isUrgent && (
              <span className="inline-flex items-center gap-1 font-body text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                <span className="w-1 h-1 rounded-full bg-white" />
                Acil
              </span>
            )}
            {categoryLabel && (
              <CategoryBadge slug={tender.category_slug} label={categoryLabel} />
            )}
          </div>
          <TenderFavoriteButton tenderId={tender.id} />
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

        {/* Footer actions */}
        <div className="mt-auto pt-3 border-t border-outline-variant flex items-center gap-2">
          <Link
            href={href}
            className="flex-1 py-2 rounded-lg bg-primary text-white font-body text-sm font-semibold text-center hover:bg-primary/90 transition-colors"
          >
            Detaylar
          </Link>
          {tender.source_url && (
            <a
              href={tender.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant font-body text-sm text-on-surface/70 hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
            >
              Kaynak
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
