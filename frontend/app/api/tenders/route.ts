import { type NextRequest, NextResponse } from "next/server";
import { getTenders, type TenderFilters, type TenderSort } from "@/lib/queries/tenders";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20) || 20));

  const rawStatus = sp.get("status") ?? "";
  const status = (["active", "planned", ""].includes(rawStatus)
    ? rawStatus
    : "") as "" | "active" | "planned";

  const rawSort = sp.get("sort") ?? "";
  const validSorts: TenderSort[] = ["deadline_asc", "newest", "budget_desc", "title_asc"];
  const sort = validSorts.includes(rawSort as TenderSort) ? (rawSort as TenderSort) : undefined;

  const filters: TenderFilters = {
    status,
    category: sp.get("category") ?? "",
    region: sp.get("region") ?? "",
    source: sp.get("source") ?? "",
    ulke: sp.get("ulke") ?? "",
    search: sp.get("q") ?? "",
    sort,
    budgetMin: sp.has("budgetMin") ? Number(sp.get("budgetMin")) : undefined,
    budgetMax: sp.has("budgetMax") ? Number(sp.get("budgetMax")) : undefined,
    deadlineFrom: sp.get("deadlineFrom") ?? "",
    deadlineTo: sp.get("deadlineTo") ?? "",
  };

  const result = await getTenders(page, filters, pageSize);
  return NextResponse.json(result);
}
