"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileSearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus when overlay opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length >= 2) {
      setOpen(false);
      setQ("");
      router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <>
      {/* Trigger button — visible only on mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Haberlerde ara"
        className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-navy/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Haber arama"
        >
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <label htmlFor="mobile-search-input" className="sr-only">
              Haber ara
            </label>
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                id="mobile-search-input"
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ülke, konu veya haber ara…"
                autoComplete="off"
                className="w-full bg-transparent border-0 outline-none text-white text-base placeholder:text-white/40 font-sans"
              />
            </form>

            <button
              type="button"
              onClick={() => { setOpen(false); setQ(""); }}
              aria-label="Aramayı kapat"
              className="p-2 text-white/60 hover:text-white transition-colors shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick links */}
          <div className="px-4 py-6">
            <p className="text-[11px] font-black tracking-[0.1em] uppercase text-white/40 mb-4">
              Popüler Kategoriler
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Fırsatlar", href: "/firsatlar" },
                { label: "Pazarlar & Ekonomi", href: "/pazarlar-ekonomi" },
                { label: "Ticaret & İhracat", href: "/ticaret-ihracat" },
                { label: "Sektör Haberleri", href: "/sektorler" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-semibold hover:border-amber hover:text-amber transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
