"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SuggestItem } from "@/app/api/search-suggest/route";

export default function HeaderSearch() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: SuggestItem[] = await res.json();
          setSuggestions(data);
          setOpen(data.length > 0);
          setActiveIdx(-1);
        }
      } catch { /* ignore */ }
    }, 250);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function navigate(url: string) {
    setOpen(false);
    setSuggestions([]);
    if (!url.startsWith("/arama")) setQ("");
    router.push(url);
  }

  const total = suggestions.length + 1;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => (i + 1) % total); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => (i <= 0 ? total - 1 : i - 1)); }
    else if (e.key === "Escape") { setOpen(false); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        navigate(suggestions[activeIdx].url);
      } else {
        const trimmed = q.trim();
        if (trimmed.length >= 2) navigate(`/arama?q=${encodeURIComponent(trimmed)}`);
      }
    }
  }

  const categoryIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="text-amber shrink-0" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );

  const articleIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="text-on-surface/30 shrink-0" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );

  const hasCats = suggestions.some(s => s.type !== "article");
  const hasArts = suggestions.some(s => s.type === "article");

  return (
    <div ref={containerRef} className="relative hidden md:block w-[280px] lg:w-[360px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = q.trim();
          if (trimmed.length >= 2) navigate(`/arama?q=${encodeURIComponent(trimmed)}`);
        }}
        role="search"
        className="flex items-center w-full bg-white/[0.08] border border-white/[0.14] rounded-sm h-[38px] px-3 gap-2 focus-within:border-white/40 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-white/60 shrink-0" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <label htmlFor="header-search-input" className="sr-only">Haber ara</label>
        <input
          id="header-search-input"
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); fetchSuggestions(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="Ülke, konu veya haber ara…"
          autoComplete="off"
          className="bg-transparent border-0 outline-none text-white text-[13px] flex-1 placeholder:text-white/45 font-sans min-w-0"
        />
        <button type="submit" aria-label="Ara" className="shrink-0 text-white/50 hover:text-white transition-colors p-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>

      {open && (
        <div role="listbox" aria-label="Arama önerileri"
          className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-outline-variant shadow-modal rounded-sm z-[100] overflow-hidden">

          {/* Kategoriler (sektör + hashtag) */}
          {hasCats && (
            <>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold text-on-surface/40 uppercase tracking-wider">Kategoriler</span>
              </div>
              {suggestions.filter(s => s.type !== "article").map((s, i) => (
                <button
                  key={s.url}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={() => navigate(s.url)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                    i === activeIdx ? "bg-primary/[0.08]" : "hover:bg-surface-2"
                  }`}
                >
                  {categoryIcon}
                  <span className="text-[13px] text-navy font-semibold line-clamp-1">{s.label}</span>
                  <span className="text-[10px] text-on-surface/30 ml-auto shrink-0">
                    {s.type === "sector" ? "Sektör" : "Etiket"}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Haberler */}
          {hasArts && (
            <>
              {hasCats && <div className="border-t border-outline-variant" />}
              {hasCats && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-on-surface/40 uppercase tracking-wider">Haberler</span>
                </div>
              )}
              {suggestions.filter(s => s.type === "article").map((s, i) => {
                const globalIdx = suggestions.findIndex(x => x === s);
                return (
                  <button
                    key={s.url}
                    role="option"
                    aria-selected={globalIdx === activeIdx}
                    onMouseDown={() => navigate(s.url)}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
                      globalIdx === activeIdx ? "bg-primary/[0.08]" : "hover:bg-surface-2"
                    }`}
                  >
                    {articleIcon}
                    <span className="text-[13px] text-navy line-clamp-1 font-medium">{s.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Tüm sonuçlar */}
          <button
            role="option"
            aria-selected={activeIdx === suggestions.length}
            onMouseDown={() => navigate(`/arama?q=${encodeURIComponent(q.trim())}`)}
            onMouseEnter={() => setActiveIdx(suggestions.length)}
            className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 border-t border-outline-variant transition-colors ${
              activeIdx === suggestions.length ? "bg-primary/[0.08]" : "hover:bg-surface-2"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-primary shrink-0" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span className="text-[13px] text-primary font-semibold">
              &ldquo;{q.trim()}&rdquo; için tüm sonuçları gör
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
