"use client";

import { useState, useRef } from "react";
import Link from "next/link";

const WEST_AFRICA_COUNTRIES: { en: string; tr: string }[] = [
  { en: "Nigeria", tr: "Nijerya" },
  { en: "Ghana", tr: "Gana" },
  { en: "Senegal", tr: "Senegal" },
  { en: "Ivory Coast", tr: "Fildisi Sahili" },
  { en: "Mali", tr: "Mali" },
  { en: "Burkina Faso", tr: "Burkina Faso" },
  { en: "Guinea", tr: "Gine" },
  { en: "Benin", tr: "Benin" },
  { en: "Togo", tr: "Togo" },
  { en: "Sierra Leone", tr: "Sierra Leone" },
  { en: "Liberia", tr: "Liberya" },
  { en: "Gambia", tr: "Gambiya" },
  { en: "Guinea-Bissau", tr: "Gine-Bissau" },
  { en: "Cape Verde", tr: "Yesil Burun Adalari" },
  { en: "Niger", tr: "Nijer" },
  { en: "Mauritania", tr: "Moritanya" },
];

// Link mode: currentFilters + no callbacks — navigates to URLs
// Callback mode: onSelect provided — calls handler instead of navigating
interface WestAfricaDropdownProps {
  // Link mode props
  currentFilters?: Record<string, string>;
  // Callback mode props
  isRegionActive?: boolean;
  onSelect?: (ulke: string) => void; // "" = Tüm Batı Afrika, "Nigeria" = country
  // Shared
  activeUlke?: string;
}

function buildUrl(filters: Record<string, string>, update: Record<string, string>): string {
  const merged = { ...filters, ...update };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/ihaleler?${qs}` : "/ihaleler";
}

export default function WestAfricaDropdown({
  currentFilters = {},
  isRegionActive: isRegionActiveProp,
  activeUlke,
  onSelect,
}: WestAfricaDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCallbackMode = typeof onSelect === "function";

  // In link mode, derive active state from currentFilters
  // In callback mode, use the explicit prop
  const isRegionActive = isCallbackMode
    ? (isRegionActiveProp ?? false)
    : currentFilters.region === "bati-afrika";

  const activeCountry = WEST_AFRICA_COUNTRIES.find((c) => c.en === activeUlke);

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  }

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body text-xs transition-colors whitespace-nowrap border ${
      active
        ? "bg-primary text-white border-primary font-semibold"
        : "border-outline-variant text-on-surface/60 hover:border-primary hover:text-primary"
    }`;

  const chevron = (
    <svg
      className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"
    >
      <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const label = isRegionActive && activeCountry ? activeCountry.tr : "Batı Afrika";

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      {isCallbackMode ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className={chipClass(isRegionActive)}
        >
          {label}
          {chevron}
        </button>
      ) : (
        <Link
          href={
            isRegionActive && !activeUlke
              ? buildUrl(currentFilters, { region: "", ulke: "" })
              : buildUrl(currentFilters, { region: "bati-afrika", ulke: "" })
          }
          className={chipClass(isRegionActive)}
        >
          {label}
          {chevron}
        </Link>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-surface-container border border-outline-variant rounded-xl shadow-lg min-w-[200px] py-1.5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <p className="px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-on-surface/40 select-none">
            Batı Afrika Ülkeleri
          </p>

          {/* Tüm Batı Afrika */}
          {isCallbackMode ? (
            <button
              onClick={() => { onSelect(""); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 font-body text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                isRegionActive && !activeUlke ? "text-primary font-semibold" : "text-on-surface/70"
              }`}
            >
              <span className="text-base">🌍</span>
              Tüm Batı Afrika
            </button>
          ) : (
            <a
              href={buildUrl(currentFilters, { region: "bati-afrika", ulke: "" })}
              className={`flex items-center gap-2 w-full px-3 py-1.5 font-body text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                isRegionActive && !activeUlke ? "text-primary font-semibold" : "text-on-surface/70"
              }`}
            >
              <span className="text-base">🌍</span>
              Tüm Batı Afrika
            </a>
          )}

          <div className="my-1 border-t border-outline-variant/50" />

          {/* Country list */}
          {WEST_AFRICA_COUNTRIES.map((country) => {
            const isActive = activeUlke === country.en;
            return isCallbackMode ? (
              <button
                key={country.en}
                onClick={() => { onSelect(country.en); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 font-body text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                  isActive ? "text-primary font-semibold bg-primary/5" : "text-on-surface/70"
                }`}
              >
                <span className="text-xs text-on-surface/30 font-mono w-4 shrink-0">{isActive ? "✓" : ""}</span>
                {country.tr}
              </button>
            ) : (
              <a
                key={country.en}
                href={buildUrl(currentFilters, { ulke: country.en })}
                className={`flex items-center gap-2 w-full px-3 py-1.5 font-body text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                  isActive ? "text-primary font-semibold bg-primary/5" : "text-on-surface/70"
                }`}
              >
                <span className="text-xs text-on-surface/30 font-mono w-4 shrink-0">{isActive ? "✓" : ""}</span>
                {country.tr}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
