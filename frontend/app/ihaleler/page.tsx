import type { Metadata } from "next";
import { getTenders, getTenderCategories, getTenderStats, type TenderSort } from "@/lib/queries/tenders";
import TendersClientShell, { type FilterState } from "./TendersClientShell";
import StatsBar from "./StatsBar";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "İhaleler | Afrika Haber",
  description: "Afrika'daki güncel ihale ve proje ilanları. UNGM, Dünya Bankası ve UNDP kaynaklı altyapı, enerji ve inşaat ihaleleri.",
  openGraph: {
    title: "İhaleler | Afrika Haber",
    description: "Afrika'daki güncel ihale ve proje ilanları. UNGM, Dünya Bankası ve UNDP kaynaklı altyapı, enerji ve inşaat ihaleleri.",
    type: "website",
  },
};

const VALID_SORTS: TenderSort[] = ["deadline_asc", "newest", "budget_desc", "title_asc"];
const VALID_STATUSES = ["active", "planned", ""] as const;
const VALID_PAGE_SIZES = [10, 20, 50] as const;

interface IhalelerPageProps {
  searchParams: {
    sayfa?: string;
    status?: string;
    category?: string;
    region?: string;
    source?: string;
    ulke?: string;
    q?: string;
    sort?: string;
    budgetMin?: string;
    budgetMax?: string;
    deadlineFrom?: string;
    deadlineTo?: string;
    pageSize?: string;
  };
}

export default async function IhalelerPage({ searchParams }: IhalelerPageProps) {
  const rawStatus = searchParams.status ?? "";
  const status = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as FilterState["status"])
    : "";

  const rawSort = searchParams.sort ?? "";
  const sort: TenderSort | "" = VALID_SORTS.includes(rawSort as TenderSort)
    ? (rawSort as TenderSort)
    : "";

  const rawPageSize = Number(searchParams.pageSize ?? 20);
  const pageSize = (VALID_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? (rawPageSize as 10 | 20 | 50)
    : 20;

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

  const initialFilters: FilterState = {
    status,
    category: searchParams.category ?? "",
    region: searchParams.region ?? "",
    ulke: searchParams.ulke ?? "",
    search: searchParams.q?.trim() ?? "",
    sort,
    budgetMin: searchParams.budgetMin ?? "",
    budgetMax: searchParams.budgetMax ?? "",
    deadlineFrom: searchParams.deadlineFrom ?? "",
    deadlineTo: searchParams.deadlineTo ?? "",
    page,
    pageSize,
  };

  const [{ tenders, count }, categories, stats] = await Promise.all([
    getTenders(page, {
      status,
      category: initialFilters.category,
      region: initialFilters.region,
      ulke: initialFilters.ulke,
      search: initialFilters.search,
      sort,
      budgetMin: initialFilters.budgetMin ? Number(initialFilters.budgetMin) : undefined,
      budgetMax: initialFilters.budgetMax ? Number(initialFilters.budgetMax) : undefined,
      deadlineFrom: initialFilters.deadlineFrom,
      deadlineTo: initialFilters.deadlineTo,
    }, pageSize),
    getTenderCategories(),
    getTenderStats(),
  ]);

  return (
    <main>
      <StatsBar stats={stats} />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="font-headline text-3xl text-on-surface">İhaleler</h1>
        </header>
        <TendersClientShell
          initialFilters={initialFilters}
          initialTenders={tenders}
          initialCount={count}
          categories={categories}
        />
      </div>
    </main>
  );
}
