"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchInputProps {
  initialValue?: string;
}

export default function SearchInput({ initialValue = "" }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when URL changes (e.g. browser back/forward)
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim().length >= 2) {
        params.set("q", next.trim());
        params.delete("sayfa");
      } else {
        params.delete("q");
        params.delete("sayfa");
      }
      router.push(`/arama${params.size > 0 ? `?${params.toString()}` : ""}`);
    }, 300);
  }

  function handleClear() {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.push("/arama");
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      {/* Search icon */}
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Afrika haberlerinde ara..."
        aria-label="Haber ara"
        className="w-full pl-10 pr-10 py-3 bg-surface border border-outline-variant rounded-xl font-body text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={handleClear}
          aria-label="Aramayı temizle"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-on-surface/70 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
