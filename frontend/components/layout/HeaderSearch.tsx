"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        if (trimmed.length >= 2) router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
      }}
      role="search"
      className="hidden md:flex items-center w-[280px] lg:w-[360px] bg-white/[0.08] border border-white/[0.14] rounded-sm h-[38px] px-3 gap-2 focus-within:border-white/40 transition-colors"
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        className="text-white/60 shrink-0"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      {/* Visually hidden label for screen readers */}
      <label htmlFor="header-search-input" className="sr-only">
        Haber ara
      </label>
      <input
        id="header-search-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ülke, konu veya haber ara…"
        autoComplete="off"
        className="bg-transparent border-0 outline-none text-white text-[13px] flex-1 placeholder:text-white/45 font-sans min-w-0"
      />
    </form>
  );
}
