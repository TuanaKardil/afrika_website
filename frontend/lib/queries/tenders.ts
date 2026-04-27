import { createBuildClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

const createClient = createBuildClient;

export type Tender = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderCategory = Database["public"]["Tables"]["tender_categories"]["Row"];

export const PAGE_SIZE = 12;

export type TenderStatus = "active" | "planned" | "expired";

export interface TenderFilters {
  status?: TenderStatus | "";
  category?: string;
  region?: string;
  source?: string;
}

// Compute tender status from dates (no status column in DB)
export function getTenderStatus(tender: Tender): TenderStatus {
  const now = new Date();
  if (tender.deadline_at && new Date(tender.deadline_at) < now) return "expired";
  if (tender.project_start_at && new Date(tender.project_start_at) > now) return "planned";
  return "active";
}

export async function getTenders(
  page = 1,
  filters: TenderFilters = {}
): Promise<{ tenders: Tender[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
    .order("deadline_at", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters.category) {
    query = query.eq("category_slug", filters.category);
  }

  if (filters.region) {
    query = query.eq("region_slug", filters.region);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  const { data, count } = await query;

  const now = new Date();
  let tenders = data ?? [];

  // Apply status filter in memory since there is no status column
  if (filters.status === "active") {
    tenders = tenders.filter((t) => getTenderStatus(t) === "active");
  } else if (filters.status === "planned") {
    tenders = tenders.filter((t) => getTenderStatus(t) === "planned");
  } else if (filters.status === "expired") {
    tenders = tenders.filter((t) => getTenderStatus(t) === "expired");
  }

  // Suppress unused variable warning
  void now;

  return { tenders, count: filters.status ? tenders.length : (count ?? 0) };
}

export async function getTenderBySlug(slug: string): Promise<Tender | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenders")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getTendersByCategory(
  categorySlug: string,
  page = 1
): Promise<{ tenders: Tender[]; count: number }> {
  const supabase = createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count } = await supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("category_slug", categorySlug)
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
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

  const { data, count } = await supabase
    .from("tenders")
    .select("*", { count: "exact" })
    .eq("region_slug", regionSlug)
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
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
    .not("title_tr", "is", null)
    .or(`deadline_at.is.null,deadline_at.gte.${now.toISOString()}`);

  // Added this week: scraped within last 7 days
  const { count: addedThisWeek } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
    .gte("scraped_at", oneWeekAgo.toISOString());

  // Expiring in 7 days: deadline between now and 7 days from now
  const { count: expiringIn7Days } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .eq("is_suppressed", false)
    .not("title_tr", "is", null)
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

export async function getAllTenderSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenders")
    .select("slug")
    .order("scraped_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => r.slug);
}
