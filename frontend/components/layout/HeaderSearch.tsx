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
        if (trimmed) router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
      }}
      className="hidden md:flex items-center flex-1 max-w-[460px] bg-white/[0.08] border border-white/[0.14] rounded-sm h-[38px] px-3 gap-2"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70 shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Haberlerde ara…"
        className="bg-transparent border-0 outline-none text-white text-[13px] flex-1 placeholder:text-white/55 font-sans"
      />
    </form>
  );
}
