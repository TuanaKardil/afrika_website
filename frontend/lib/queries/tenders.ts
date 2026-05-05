import { createBuildClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { getTenderStatus as _getTenderStatus } from "@/lib/tender-utils";

const createClient = createBuildClient;

export type Tender = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderCategory = Database["public"]["Tables"]["tender_categories"]["Row"];

export const PAGE_SIZE = 12;

// Re-export from client-safe utils so server-side callers keep one import path
export type { TenderStatus, TenderSort } from "@/lib/tender-utils";
export { getTenderStatus } from "@/lib/tender-utils";

export interface TenderFilters {
  status?: "active" | "planned" | "expired" | "";
  category?: string;
  region?: string;
  source?: string;
  ulke?: string;
  search?: string;
  sort?: "deadline_asc" | "newest" | "budget_desc" | "title_asc" | "";
  budgetMin?: number;
  budgetMax?: number;
  deadlineFrom?: string; // YYYY-MM-DD
  deadlineTo?: string;   // YYYY-MM-DD
}

export async function getTenders(
  page = 1,
  filters: TenderFilters = {},
  pageSize = PAGE_SIZE
): Promise<{ tenders: Tender[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * pageSize;
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .range(offset, offset + pageSize - 1);

  // Sorting
  const sort = filters.sort || "deadline_asc";
  if (sort === "newest") {
    query = query.order("scraped_at", { ascending: false });
  } else if (sort === "budget_desc") {
    query = query.order("budget_usd", { ascending: false, nullsFirst: false });
  } else if (sort === "title_asc") {
    query = query.order("title_tr", { ascending: true });
  } else {
    // deadline_asc (default: soonest deadline first)
    query = query.order("deadline_at", { ascending: true });
  }

  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.region) query = query.eq("region_slug", filters.region);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.ulke) query = query.ilike("country", filters.ulke);
  if (filters.budgetMin != null) query = query.gte("budget_usd", filters.budgetMin);
  if (filters.budgetMax != null) query = query.lte("budget_usd", filters.budgetMax);
  if (filters.deadlineFrom) query = query.gte("deadline_at", filters.deadlineFrom);
  if (filters.deadlineTo) query = query.lte("deadline_at", filters.deadlineTo + "T23:59:59Z");

  // Search: ILIKE across title, institution, reference_number, country, description
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `title_tr.ilike.%${term}%,institution_tr.ilike.%${term}%,reference_number.ilike.%${term}%,country_tr.ilike.%${term}%,description_tr.ilike.%${term}%`
    );
  }

  // Always exclude expired at the DB level — show only active/planned tenders
  query = query.or(`deadline_at.is.null,deadline_at.gte.${nowIso}`);

  const { data, count } = await query;
  let tenders = data ?? [];

  // Refine active vs planned in-memory (both are within the non-expired set)
  if (filters.status === "active") {
    tenders = tenders.filter((t) => _getTenderStatus(t) === "active");
  } else if (filters.status === "planned") {
    tenders = tenders.filter((t) => _getTenderStatus(t) === "planned");
  }

  return {
    tenders,
    count: (filters.status === "active" || filters.status === "planned")
      ? tenders.length
      : (count ?? 0),
  };
}

export async function getTenderBySlug(slug: string): Promise<Tender | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenders")
    .select("*")
    .eq("slug", slug)
    .order("scraped_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export async function getTendersByCategory(
  categorySlug: string,
  page = 1
): Promise<{ tenders: Tender[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;
  const nowIso = new Date().toISOString();

  const { data, count } = await supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("category_slug", categorySlug)
    .eq("is_suppressed", false)
    .or(`deadline_at.is.null,deadline_at.gte.${nowIso}`)
    .order("deadline_at", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  return { tenders: data ?? [], count: count ?? 0 };
}

export async function getTendersByRegion(
  regionSlug: string,
  page = 1
): Promise<{ tenders: Tender[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;
  const nowIso = new Date().toISOString();

  const { data, count } = await supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("region_slug", regionSlug)
    .eq("is_suppressed", false)
    .or(`deadline_at.is.null,deadline_at.gte.${nowIso}`)
    .order("deadline_at", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  return { tenders: data ?? [], count: count ?? 0 };
}

export async function getTenderCategories(): Promise<TenderCategory[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tender_categories")
    .select("*")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export interface TenderStats {
  active: number;
  addedThisWeek: number;
  expiringIn7Days: number;
  totalBudgetUsd: number;
}

export async function getTenderStats(): Promise<TenderStats> {
  const supabase = createClient();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Active tenders: deadline in the future (or no deadline) and not suppressed
  const { count: active } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .eq("is_suppressed", false)
    .or(`deadline_at.is.null,deadline_at.gte.${now.toISOString()}`);

  // Added this week: scraped within last 7 days
  const { count: addedThisWeek } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .eq("is_suppressed", false)
    .gte("scraped_at", oneWeekAgo.toISOString());

  // Expiring in 7 days: deadline between now and 7 days from now
  const { count: expiringIn7Days } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .eq("is_suppressed", false)
    .gte("deadline_at", now.toISOString())
    .lte("deadline_at", sevenDaysFromNow.toISOString());

  // Total budget: sum of budget_usd
  const { data: budgetData } = await supabase
    .from("tenders")
    .select("budget_usd")
    .eq("is_suppressed", false)
    .not("budget_usd", "is", null);

  const totalBudgetUsd = (budgetData ?? []).reduce(
    (sum, row) => sum + (row.budget_usd ?? 0),
    0
  );

  return {
    active: active ?? 0,
    addedThisWeek: addedThisWeek ?? 0,
    expiringIn7Days: expiringIn7Days ?? 0,
    totalBudgetUsd,
  };
}

export async function getSimilarTenders(
  tender: Tender,
  limit = 4
): Promise<Tender[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const base = () =>
    supabase
      .from("tenders")
      .select("*")
      .eq("is_suppressed", false)
      .neq("id", tender.id)
      .or(`deadline_at.is.null,deadline_at.gte.${nowIso}`)
      .order("deadline_at", { ascending: true })
      .limit(10);

  const [countryRes, categoryRes] = await Promise.all([
    tender.country ? base().eq("country", tender.country) : Promise.resolve({ data: [] as Tender[] }),
    tender.category_slug ? base().eq("category_slug", tender.category_slug) : Promise.resolve({ data: [] as Tender[] }),
  ]);

  const countryIds = new Set((countryRes.data ?? []).map((t) => t.id));
  const seen = new Set<string>();
  const all: Tender[] = [];

  for (const t of countryRes.data ?? []) {
    if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
  }
  for (const t of categoryRes.data ?? []) {
    if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
  }

  // Sort: country match first, then budget proximity
  all.sort((a, b) => {
    const aCountry = countryIds.has(a.id) ? 0 : 1;
    const bCountry = countryIds.has(b.id) ? 0 : 1;
    if (aCountry !== bCountry) return aCountry - bCountry;
    if (tender.budget_usd != null) {
      const aDiff = a.budget_usd != null ? Math.abs(a.budget_usd - tender.budget_usd!) : Infinity;
      const bDiff = b.budget_usd != null ? Math.abs(b.budget_usd - tender.budget_usd!) : Infinity;
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    return 0;
  });

  return all.slice(0, limit);
}

export async function getAllTenderSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenders")
    .select("slug")
    .order("scraped_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => r.slug);
}
