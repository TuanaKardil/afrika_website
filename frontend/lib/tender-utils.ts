// Pure, client-safe tender utilities — no server imports, no next/headers
import type { Database } from "@/lib/database.types";

export type TenderRow = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderStatus = "active" | "planned" | "expired";
export type TenderSort = "deadline_asc" | "newest" | "budget_desc" | "title_asc";

export function getTenderStatus(tender: TenderRow): TenderStatus {
  const now = new Date();
  if (tender.deadline_at && new Date(tender.deadline_at) < now) return "expired";
  if (tender.project_start_at && new Date(tender.project_start_at) > now) return "planned";
  return "active";
}

export function formatBudget(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}Mr`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString("tr-TR")}`;
}
