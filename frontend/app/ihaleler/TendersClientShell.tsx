"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import TenderCard from "@/components/ui/TenderCard";
import WestAfricaDropdown from "@/components/ui/WestAfricaDropdown";
import type { TenderSort } from "@/lib/tender-utils";
import type { Tender, TenderCategory } from "@/lib/queries/tenders";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export interface FilterState {
  status: "" | "active" | "planned" | "expired";
  category: string;
  region: string;
  ulke: string;
  search: string;
  sort: TenderSort | "";
  budgetMin: string;
  budgetMax: string;
  deadlineFrom: string;
  deadlineTo: string;
  page: number;
  pageSize: 10 | 20 | 50;
}

const DEFAULT: FilterState = {
  status: "", category: "", region: "", ulke: "", search: "", sort: "",
  budgetMin: "", budgetMax: "", deadlineFrom: "", deadlineTo: "", page: 1, pageSize: 20,
};

const STATUS_OPTIONS: { value: FilterState["status"]; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "planned", label: "Planlandı" },
  { value: "expired", label: "Süresi Doldu" },
];

const SORT_OPTIONS: { value: TenderSort; label: string }[] = [
  { value: "deadline_asc", label: "Yakında Bitenler" },
  { value: "newest", label: "Yeni Eklenenler" },
  { value: "budget_desc", label: "En Yüksek Bütçe" },
  { value: "title_asc", label: "A-Z" },
];

const REGION_OPTIONS = [
  { value: "", label: "Tüm Bölgeler" },
  { value: "afrika", label: "Afrika" },
  { value: "kuzey-afrika", label: "Kuzey Afrika" },
  { value: "orta-afrika", label: "Orta Afrika" },
  { value: "dogu-afrika", label: "Doğu Afrika" },
  { value: "guney-afrika", label: "Güney Afrika" },
];

const REGION_LABELS: Record<string, string> = {
  "afrika": "Afrika", "kuzey-afrika": "Kuzey Afrika", "bati-afrika": "Batı Afrika",
  "orta-afrika": "Orta Afrika", "dogu-afrika": "Doğu Afrika", "guney-afrika": "Güney Afrika",
};

const PAGE_SIZE_OPTIONS: (10 | 20 | 50)[] = [10, 20, 50];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.status) n++;
  if (f.category) n++;
  if (f.region || f.ulke) n++;
  if (f.search) n++;
  if (f.budgetMin) n++;
  if (f.budgetMax) n++;
  if (f.deadlineFrom) n++;
  if (f.deadlineTo) n++;
  return n;
}

function buildApiUrl(f: FilterState): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.category) p.set("category", f.category);
  if (f.region) p.set("region", f.region);
  if (f.ulke) p.set("ulke", f.ulke);
  if (f.search) p.set("q", f.search);
  if (f.sort) p.set("sort", f.sort);
  if (f.budgetMin) p.set("budgetMin", f.budgetMin);
  if (f.budgetMax) p.set("budgetMax", f.budgetMax);
  if (f.deadlineFrom) p.set("deadlineFrom", f.deadlineFrom);
  if (f.deadlineTo) p.set("deadlineTo", f.deadlineTo);
  p.set("page", String(f.page));
  p.set("pageSize", String(f.pageSize));
  return `/api/tenders?${p.toString()}`;
}

// ---------------------------------------------------------------------------
// Session cache — instant back navigation
// ---------------------------------------------------------------------------

const SS_KEY = "ihaleler_cache";
const SS_TTL = 5 * 60_000; // 5 minutes

interface ListCache { filters: FilterState; tenders: Tender[]; count: number; url: string; ts: number; }

function ssRead(): ListCache | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ListCache;
    if (Date.now() - c.ts > SS_TTL) return null;
    return c;
  } catch { return null; }
}

function ssWrite(filters: FilterState, tenders: Tender[], count: number, url: string) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify({ filters, tenders, count, url, ts: Date.now() })); }
  catch {}
}

function buildPageUrl(pathname: string, f: FilterState): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.category) p.set("category", f.category);
  if (f.region) p.set("region", f.region);
  if (f.ulke) p.set("ulke", f.ulke);
  if (f.search) p.set("q", f.search);
  if (f.sort) p.set("sort", f.sort);
  if (f.budgetMin) p.set("budgetMin", f.budgetMin);
  if (f.budgetMax) p.set("budgetMax", f.budgetMax);
  if (f.deadlineFrom) p.set("deadlineFrom", f.deadlineFrom);
  if (f.deadlineTo) p.set("deadlineTo", f.deadlineTo);
  if (f.page > 1) p.set("sayfa", String(f.page));
  if (f.pageSize !== 20) p.set("pageSize", String(f.pageSize));
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function chipBtn(active: boolean, extra = "") {
  return `px-2.5 py-1 rounded-full font-body text-xs transition-colors whitespace-nowrap border ${
    active
      ? "bg-primary text-white border-primary font-semibold"
      : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
  } ${extra}`;
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------

function ActiveChips({
  filters,
  categories,
  onChange,
}: {
  filters: FilterState;
  categories: TenderCategory[];
  onChange: (f: FilterState) => void;
}) {
  type ChipKey = "status" | "category" | "region_ulke" | "search" | "budgetMin" | "budgetMax" | "deadlineFrom" | "deadlineTo";
  const chips: { key: ChipKey; label: string }[] = [];

  if (filters.status) chips.push({ key: "status", label: filters.status === "active" ? "Aktif" : "Planlandı" });
  if (filters.category) {
    const cat = categories.find((c) => c.slug === filters.category);
    chips.push({ key: "category", label: cat?.name_tr ?? filters.category });
  }
  if (filters.ulke) chips.push({ key: "region_ulke", label: filters.ulke });
  else if (filters.region) chips.push({ key: "region_ulke", label: REGION_LABELS[filters.region] ?? filters.region });
  if (filters.search) chips.push({ key: "search", label: `"${filters.search}"` });
  if (filters.budgetMin) chips.push({ key: "budgetMin", label: `Min $${Number(filters.budgetMin).toLocaleString("tr-TR")}` });
  if (filters.budgetMax) chips.push({ key: "budgetMax", label: `Maks $${Number(filters.budgetMax).toLocaleString("tr-TR")}` });
  if (filters.deadlineFrom) chips.push({ key: "deadlineFrom", label: `Son: ${filters.deadlineFrom.split("-").reverse().join(".")} itibaren` });
  if (filters.deadlineTo) chips.push({ key: "deadlineTo", label: `Son: ${filters.deadlineTo.split("-").reverse().join(".")} kadar` });

  if (chips.length === 0) return null;

  function remove(key: ChipKey) {
    if (key === "region_ulke") onChange({ ...filters, region: "", ulke: "", page: 1 });
    else onChange({ ...filters, [key]: "", page: 1 } as FilterState);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary/10 text-primary font-body text-xs font-medium">
          {chip.label}
          <button onClick={() => remove(chip.key)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ ...DEFAULT, pageSize: filters.pageSize })}
        className="font-body text-xs text-on-surface/40 hover:text-red-500 transition-colors underline underline-offset-2"
      >
        Tümünü Temizle
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer (all filters)
// ---------------------------------------------------------------------------

function MobileDrawer({
  open, onClose, filters, categories, onChange,
}: {
  open: boolean; onClose: () => void;
  filters: FilterState; categories: TenderCategory[];
  onChange: (f: FilterState) => void;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  function set(patch: Partial<FilterState>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-outline-variant shrink-0">
          <h2 className="font-headline text-lg text-on-surface">Filtreler</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <svg className="w-5 h-5 text-on-surface/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
          {/* Sort */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Sırala</p>
            <div className="relative">
              <select
                value={filters.sort || "deadline_asc"}
                onChange={(e) => set({ sort: e.target.value as TenderSort })}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Durum</p>
            <div className="flex gap-1 bg-surface-container rounded-lg p-0.5 w-fit">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.value || "all"} onClick={() => { set({ status: opt.value }); }}
                  className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors whitespace-nowrap ${filters.status === opt.value ? "bg-primary text-white font-semibold" : "text-on-surface/70 hover:text-primary"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Bölge</p>
            <div className="flex flex-wrap gap-1.5">
              {REGION_OPTIONS.map((opt) => (
                <button key={opt.value || "all"} onClick={() => set({ region: opt.value, ulke: "" })}
                  className={chipBtn((filters.region === opt.value && !filters.ulke))}>
                  {opt.label}
                </button>
              ))}
              <WestAfricaDropdown
                activeUlke={filters.ulke}
                isRegionActive={filters.region === "bati-afrika"}
                onSelect={(ulke) => set({ region: "bati-afrika", ulke })}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Kategori</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => set({ category: "" })} className={chipBtn(!filters.category)}>Tümü</button>
              {categories.map((cat) => (
                <button key={cat.slug} onClick={() => set({ category: cat.slug })}
                  className={chipBtn(filters.category === cat.slug)}>
                  {cat.name_tr}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Bütçe Aralığı (USD)</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-xs text-on-surface/40">$</span>
                <input type="number" min={0} value={filters.budgetMin}
                  onChange={(e) => set({ budgetMin: e.target.value })}
                  placeholder="Min"
                  className="w-full pl-6 pr-3 py-2 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary transition-colors" />
              </div>
              <span className="text-on-surface/40 text-xs">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-xs text-on-surface/40">$</span>
                <input type="number" min={0} value={filters.budgetMax}
                  onChange={(e) => set({ budgetMax: e.target.value })}
                  placeholder="Maks"
                  className="w-full pl-6 pr-3 py-2 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-2">Son Başvuru Tarihi</p>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.deadlineFrom}
                onChange={(e) => set({ deadlineFrom: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
              <span className="text-on-surface/40 text-xs">-</span>
              <input type="date" value={filters.deadlineTo}
                onChange={(e) => set({ deadlineTo: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-outline-variant flex gap-3 shrink-0">
          <button onClick={() => onChange({ ...DEFAULT, pageSize: filters.pageSize })}
            className="flex-1 py-2.5 rounded-lg border border-outline-variant font-body text-sm text-on-surface/70 hover:bg-surface-container transition-colors">
            Temizle
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-primary text-white font-body text-sm font-semibold hover:bg-primary/90 transition-colors">
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid skeleton
// ---------------------------------------------------------------------------

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
        <div key={i} className="rounded-xl bg-surface-container border border-outline-variant animate-pulse p-4 space-y-3 min-h-[200px]">
          <div className="flex gap-2"><div className="h-5 w-14 rounded-full bg-outline-variant" /><div className="h-5 w-20 rounded-full bg-outline-variant" /></div>
          <div className="h-5 w-4/5 rounded bg-outline-variant" />
          <div className="h-4 w-3/5 rounded bg-outline-variant" />
          <div className="mt-4 flex gap-2"><div className="h-9 flex-1 rounded-lg bg-outline-variant" /><div className="h-9 w-20 rounded-lg bg-outline-variant" /></div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ isPlanned, onClearStatus }: { isPlanned: boolean; onClearStatus: () => void }) {
  if (isPlanned) {
    return (
      <div className="py-16 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-on-surface/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="font-headline text-lg text-on-surface mb-2">Yakında Planlanan İhaleler</h3>
        <p className="font-body text-sm text-on-surface/50 mb-6 max-w-xs mx-auto">
          Şu anda planlanmış ihale bulunmuyor. Yeni ihaleler eklendiğinde burada görünecek.
        </p>
        <button onClick={onClearStatus}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-body text-sm font-semibold hover:bg-primary/90 transition-colors">
          Aktif İhalelere Göz At
        </button>
      </div>
    );
  }
  return (
    <div className="py-16 text-center">
      <svg className="w-12 h-12 mx-auto mb-3 text-on-surface/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="font-body text-on-surface/50 text-sm">Bu filtrelere uygun ihale bulunamadı.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function ClientPagination({ page, total, pageSize, onPage, onPageSize }: {
  page: number; total: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (ps: 10 | 20 | 50) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const base = "flex items-center justify-center font-body text-sm rounded-lg transition-colors";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10">
      {/* Page size */}
      <div className="flex items-center gap-2 font-body text-sm text-on-surface/50 order-2 sm:order-1">
        <span>Sayfa başına:</span>
        {PAGE_SIZE_OPTIONS.map((ps) => (
          <button key={ps} onClick={() => onPageSize(ps)}
            className={`w-9 h-8 rounded-lg border font-body text-sm transition-colors ${
              pageSize === ps
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
            }`}>
            {ps}
          </button>
        ))}
      </div>

      {/* Prev / pages / next */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 order-1 sm:order-2">
          {page > 1 ? (
            <button onClick={() => onPage(page - 1)} className={`${base} px-3 h-9 gap-1.5 text-on-surface/70 hover:bg-surface-container hover:text-primary`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Önceki
            </button>
          ) : (
            <span className={`${base} px-3 h-9 gap-1.5 text-on-surface/30 cursor-not-allowed`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Önceki
            </span>
          )}

          {start > 1 && <><button onClick={() => onPage(1)} className={`${base} w-9 h-9 text-on-surface/70 hover:bg-surface-container hover:text-primary`}>1</button>{start > 2 && <span className="px-1 text-on-surface/40">...</span>}</>}
          {pages.map((p) => (
            <button key={p} onClick={() => onPage(p)}
              className={`${base} w-9 h-9 ${p === page ? "bg-primary text-white font-semibold" : "text-on-surface/70 hover:bg-surface-container hover:text-primary"}`}>
              {p}
            </button>
          ))}
          {end < totalPages && <>{end < totalPages - 1 && <span className="px-1 text-on-surface/40">...</span>}<button onClick={() => onPage(totalPages)} className={`${base} w-9 h-9 text-on-surface/70 hover:bg-surface-container hover:text-primary`}>{totalPages}</button></>}

          {page < totalPages ? (
            <button onClick={() => onPage(page + 1)} className={`${base} px-3 h-9 gap-1.5 text-on-surface/70 hover:bg-surface-container hover:text-primary`}>
              Sonraki
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <span className={`${base} px-3 h-9 gap-1.5 text-on-surface/30 cursor-not-allowed`}>
              Sonraki
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface TendersClientShellProps {
  initialFilters: FilterState;
  initialTenders: Tender[];
  initialCount: number;
  categories: TenderCategory[];
}

export default function TendersClientShell({
  initialFilters, initialTenders, initialCount, categories,
}: TendersClientShellProps) {
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [tenders, setTenders] = useState<Tender[]>(initialTenders);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialFilters.budgetMin || initialFilters.budgetMax || initialFilters.deadlineFrom || initialFilters.deadlineTo)
  );

  // skipCount: how many effect runs to skip (1 for fresh mount, 2 for back-nav restore)
  const skipCount = useRef(1);
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>();
  // Always tracks latest state so we can write to cache on unmount
  const stateRef = useRef({ filters, tenders, count });
  stateRef.current = { filters, tenders, count };
  // Tracks this page's own URL (updated after every replaceState).
  // Cannot use window.location.href in cleanup because Next.js changes the URL
  // before unmounting, so it would capture the destination URL instead.
  const listUrlRef = useRef("");

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c.slug] = c.name_tr; });
    return m;
  }, [categories]);

  const activeFilterCount = countActiveFilters(filters);
  const filtersKey = JSON.stringify(filters);

  // Back-navigation cache: restore before first paint; save on unmount.
  useLayoutEffect(() => {
    listUrlRef.current = window.location.href; // Capture URL at mount time

    const cached = ssRead();
    if (cached && cached.url === listUrlRef.current) {
      skipCount.current = 2; // skip both renders (initial + state-update re-render)
      setFilters(cached.filters);
      setTenders(cached.tenders);
      setCount(cached.count);
      if (cached.filters.budgetMin || cached.filters.budgetMax || cached.filters.deadlineFrom || cached.filters.deadlineTo) {
        setShowAdvanced(true);
      }
    }

    return () => {
      // Save with listUrlRef (not window.location.href — URL may already be the next page's)
      const s = stateRef.current;
      if (s.tenders.length > 0) ssWrite(s.filters, s.tenders, s.count, listUrlRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipCount.current > 0) { skipCount.current--; return; }
    clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(filters));
        if (!res.ok) return;
        const json = await res.json();
        setTenders(json.tenders ?? []);
        setCount(json.count ?? 0);
      } finally {
        setLoading(false);
      }
      window.history.replaceState(window.history.state, "", buildPageUrl(pathname, filters));
      listUrlRef.current = window.location.href; // Keep in sync after URL update
    }, 300);
    return () => clearTimeout(fetchTimer.current);
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function change(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  function setPage(p: number) { setFilters((prev) => ({ ...prev, page: p })); }
  function setPageSize(ps: 10 | 20 | 50) { setFilters((prev) => ({ ...prev, pageSize: ps, page: 1 })); }

  const hasAdvanced = !!(filters.budgetMin || filters.budgetMax || filters.deadlineFrom || filters.deadlineTo);

  return (
    <>
      {/* ── Top bar: search + sort (desktop) / search + filter button (mobile) ── */}
      <div className="flex gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={filters.search}
            onChange={(e) => change({ search: e.target.value })}
            placeholder="İhale adı, kurum, ülke veya referans no ile ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Sort — desktop only */}
        <div className="relative hidden sm:block shrink-0">
          <select value={filters.sort || "deadline_asc"}
            onChange={(e) => change({ sort: e.target.value as TenderSort })}
            className="pl-3 pr-8 py-2.5 rounded-lg border border-outline-variant bg-surface-container font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-w-[170px]">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Mobile filter button */}
        <button onClick={() => setDrawerOpen(true)}
          className="sm:hidden inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container font-body text-sm text-on-surface hover:border-primary hover:text-primary transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">{activeFilterCount}</span>
          )}
          Filtrele
        </button>
      </div>

      {/* ── Active filter chips ── */}
      <ActiveChips filters={filters} categories={categories} onChange={(f) => setFilters(f)} />

      {/* ── Compact sticky filter bar (desktop) ── */}
      <div className="hidden sm:block md:sticky md:top-0 z-30 bg-background border-b border-outline-variant py-3 mb-6 -mx-4 px-4">
        {/* Row 1: status + regions + advanced toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5 shrink-0">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value || "all"} onClick={() => change({ status: opt.value })}
                className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors whitespace-nowrap ${filters.status === opt.value ? "bg-primary text-white font-semibold" : "text-on-surface/70 hover:text-primary"}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Region chips */}
          <div className="flex flex-wrap items-center gap-1">
            {REGION_OPTIONS.map((opt) => (
              <button key={opt.value || "all"} onClick={() => change({ region: opt.value, ulke: "" })}
                className={chipBtn(filters.region === opt.value && !filters.ulke)}>
                {opt.label}
              </button>
            ))}
            <WestAfricaDropdown
              activeUlke={filters.ulke}
              isRegionActive={filters.region === "bati-afrika"}
              onSelect={(ulke) => change({ region: "bati-afrika", ulke })}
            />
          </div>

          {/* Spacer + advanced toggle */}
          <div className="ml-auto">
            <button onClick={() => setShowAdvanced((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body text-xs transition-colors ${
                hasAdvanced ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
              }`}>
              Gelişmiş
              {hasAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: category chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button onClick={() => change({ category: "" })} className={chipBtn(!filters.category)}>Tüm Kategoriler</button>
          {categories.map((cat) => (
            <button key={cat.slug} onClick={() => change({ category: cat.slug })}
              className={chipBtn(filters.category === cat.slug)}>
              {cat.name_tr}
            </button>
          ))}
        </div>

        {/* Row 3: advanced filters (collapsible) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-end gap-4 mt-3 pt-3 border-t border-outline-variant">
            {/* Budget */}
            <div>
              <p className="font-body text-xs text-on-surface/50 mb-1.5">Bütçe (USD)</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface/40">$</span>
                  <input type="number" min={0} value={filters.budgetMin}
                    onChange={(e) => change({ budgetMin: e.target.value })}
                    placeholder="Min" className="w-28 pl-6 pr-2 py-1.5 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary transition-colors" />
                </div>
                <span className="text-on-surface/40 text-xs">-</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface/40">$</span>
                  <input type="number" min={0} value={filters.budgetMax}
                    onChange={(e) => change({ budgetMax: e.target.value })}
                    placeholder="Maks" className="w-28 pl-6 pr-2 py-1.5 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
            </div>

            {/* Deadline date range */}
            <div>
              <p className="font-body text-xs text-on-surface/50 mb-1.5">Son Başvuru Tarihi</p>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.deadlineFrom}
                  onChange={(e) => change({ deadlineFrom: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
                <span className="text-on-surface/40 text-xs">-</span>
                <input type="date" value={filters.deadlineTo}
                  onChange={(e) => change({ deadlineTo: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant bg-background font-body text-sm text-on-surface focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            {/* Clear advanced */}
            {hasAdvanced && (
              <button onClick={() => { change({ budgetMin: "", budgetMax: "", deadlineFrom: "", deadlineTo: "" }); }}
                className="pb-0.5 font-body text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors">
                Temizle
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Result count ── */}
      <div className="mb-4 min-h-[20px]">
        {filters.search ? (
          <p className="font-body text-sm text-on-surface/60">
            <span className="font-semibold text-primary">{count}</span> ihale bulundu, &ldquo;{filters.search}&rdquo;
          </p>
        ) : count > 0 ? (
          <p className="font-body text-sm text-on-surface/50">{count} ihale</p>
        ) : null}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <GridSkeleton count={filters.pageSize} />
      ) : tenders.length === 0 ? (
        <EmptyState
          isPlanned={filters.status === "planned"}
          onClearStatus={() => change({ status: "active" })}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender}
              categoryNameTr={tender.category_slug ? categoryMap[tender.category_slug] : undefined} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <ClientPagination page={filters.page} total={count} pageSize={filters.pageSize} onPage={setPage} onPageSize={setPageSize} />

      {/* ── Mobile drawer ── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        filters={filters} categories={categories}
        onChange={(f) => setFilters(f)} />
    </>
  );
}
