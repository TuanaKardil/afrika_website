"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TenderSort } from "@/lib/queries/tenders";

const SORT_OPTIONS: { value: TenderSort; label: string }[] = [
  { value: "deadline_asc", label: "Yakında Bitenler" },
  { value: "newest", label: "Yeni Eklenenler" },
  { value: "budget_desc", label: "En Yüksek Bütçe" },
  { value: "title_asc", label: "A-Z" },
];

interface TendersSearchBarProps {
  initialSearch: string;
  initialSort: TenderSort | "";
}

export default function TendersSearchBar({ initialSearch, initialSort }: TendersSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildUpdatedUrl(search: string, sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("q", search);
    } else {
      params.delete("q");
    }
    if (sort && sort !== "deadline_asc") {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }
    // Reset pagination on search/sort change
    params.delete("sayfa");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const currentQ = searchParams.get("q") ?? "";
      if (inputValue !== currentQ) {
        router.replace(buildUpdatedUrl(inputValue, searchParams.get("sort") ?? ""));
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSort = e.target.value;
    router.replace(buildUpdatedUrl(inputValue, newSort));
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="İhale adı, kurum, ülke veya referans no ile ara..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-outline-variant bg-surface-container font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
        {inputValue && (
          <button
            onClick={() => setInputValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-on-surface transition-colors"
            aria-label="Aramayı temizle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative shrink-0">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 12h12M9 17h6" />
        </svg>
        <select
          value={initialSort || "deadline_asc"}
          onChange={handleSortChange}
          className="pl-9 pr-8 py-2.5 rounded-lg border border-outline-variant bg-surface-container font-body text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none cursor-pointer min-w-[190px]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
