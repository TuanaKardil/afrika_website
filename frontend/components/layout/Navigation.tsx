"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type SectorEntry = { href: string; label: string };

const SECTORS: SectorEntry[] = [
  { href: "/sektorler/insaat-muteahhitlik", label: "İnşaat & Müteahhitlik" },
  { href: "/sektorler/enerji", label: "Enerji" },
  { href: "/sektorler/savunma-sanayi", label: "Savunma Sanayi" },
  { href: "/sektorler/madencilik", label: "Madencilik" },
  { href: "/sektorler/tekstil-hazir-giyim", label: "Tekstil & Hazır Giyim" },
  { href: "/sektorler/kozmetik-hijyen", label: "Kozmetik & Hijyen" },
  { href: "/sektorler/demir-celik-sanayi", label: "Demir-Çelik & Sanayi" },
  { href: "/sektorler/tarim-gida", label: "Tarım & Gıda" },
  { href: "/sektorler/otomotiv", label: "Otomotiv" },
];

const COUNTRIES = [
  { href: "/ulkeler/angola", label: "Angola" },
  { href: "/ulkeler/benin", label: "Benin" },
  { href: "/ulkeler/botsvana", label: "Botsvana" },
  { href: "/ulkeler/burkina-faso", label: "Burkina Faso" },
  { href: "/ulkeler/burundi", label: "Burundi" },
  { href: "/ulkeler/cezayir", label: "Cezayir" },
  { href: "/ulkeler/cibuti", label: "Cibuti" },
  { href: "/ulkeler/cad", label: "Çad" },
  { href: "/ulkeler/demokratik-kongo", label: "Demokratik Kongo" },
  { href: "/ulkeler/ekvator-ginesi", label: "Ekvator Ginesi" },
  { href: "/ulkeler/eritre", label: "Eritre" },
  { href: "/ulkeler/eswatini", label: "Eswatini" },
  { href: "/ulkeler/etiyopya", label: "Etiyopya" },
  { href: "/ulkeler/fas", label: "Fas" },
  { href: "/ulkeler/fildisi-sahili", label: "Fildişi Sahili" },
  { href: "/ulkeler/gabon", label: "Gabon" },
  { href: "/ulkeler/gambiya", label: "Gambiya" },
  { href: "/ulkeler/gana", label: "Gana" },
  { href: "/ulkeler/gine", label: "Gine" },
  { href: "/ulkeler/gine-bissau", label: "Gine-Bissau" },
  { href: "/ulkeler/guney-afrika", label: "Güney Afrika" },
  { href: "/ulkeler/guney-sudan", label: "Güney Sudan" },
  { href: "/ulkeler/kamerun", label: "Kamerun" },
  { href: "/ulkeler/kenya", label: "Kenya" },
  { href: "/ulkeler/komorlar", label: "Komorlar" },
  { href: "/ulkeler/kongo-cumhuriyeti", label: "Kongo Cumhuriyeti" },
  { href: "/ulkeler/lesoto", label: "Lesoto" },
  { href: "/ulkeler/liberya", label: "Liberya" },
  { href: "/ulkeler/libya", label: "Libya" },
  { href: "/ulkeler/madagaskar", label: "Madagaskar" },
  { href: "/ulkeler/malavi", label: "Malavi" },
  { href: "/ulkeler/mali", label: "Mali" },
  { href: "/ulkeler/mauritius", label: "Mauritius" },
  { href: "/ulkeler/misir", label: "Mısır" },
  { href: "/ulkeler/moritanya", label: "Moritanya" },
  { href: "/ulkeler/mozambik", label: "Mozambik" },
  { href: "/ulkeler/namibya", label: "Namibya" },
  { href: "/ulkeler/nijer", label: "Nijer" },
  { href: "/ulkeler/nijerya", label: "Nijerya" },
  { href: "/ulkeler/orta-afrika-cumhuriyeti", label: "Orta Afrika Cum." },
  { href: "/ulkeler/ruanda", label: "Ruanda" },
  { href: "/ulkeler/sao-tome-ve-principe", label: "Sao Tome & Principe" },
  { href: "/ulkeler/senegal", label: "Senegal" },
  { href: "/ulkeler/seyseller", label: "Seyşeller" },
  { href: "/ulkeler/sierra-leone", label: "Sierra Leone" },
  { href: "/ulkeler/somali", label: "Somali" },
  { href: "/ulkeler/sudan", label: "Sudan" },
  { href: "/ulkeler/tanzanya", label: "Tanzanya" },
  { href: "/ulkeler/togo", label: "Togo" },
  { href: "/ulkeler/tunus", label: "Tunus" },
  { href: "/ulkeler/uganda", label: "Uganda" },
  { href: "/ulkeler/yesil-burun-adalari", label: "Yeşil Burun Adaları" },
  { href: "/ulkeler/zambiya", label: "Zambiya" },
  { href: "/ulkeler/zimbabve", label: "Zimbabve" },
];

const NAV_TABS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  { href: "/sektorler", label: "Sektör Haberleri", hasSectorDrop: true },
  { href: "/ulkeler", label: "Ülkeler", hasCountryDrop: true },
];

export default function Navigation() {
  const pathname = usePathname();
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDrop(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on route change
  useEffect(() => { setOpenDrop(null); }, [pathname]);

  function toggleDrop(slug: string) {
    setOpenDrop((prev) => (prev === slug ? null : slug));
  }

  return (
    <nav ref={navRef} className="relative bg-white border-b border-outline-variant" aria-label="Ana navigasyon">
      {/* Scrollable tab row */}
      <div className="max-w-container mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
        <ul
          className="flex items-center gap-1 md:gap-2 h-[44px] md:h-[52px] min-w-max"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {NAV_TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/" && pathname.startsWith(tab.href));
            const hasDrop = tab.hasSectorDrop || tab.hasCountryDrop;
            const isOpen = openDrop === tab.href;

            return (
              <li key={tab.href} className="relative h-full flex items-center">
                {hasDrop ? (
                  <button
                    type="button"
                    onClick={() => toggleDrop(tab.href)}
                    className={`h-full inline-flex items-center gap-1.5 px-2.5 md:px-3.5 text-xs md:text-sm font-bold tracking-[-0.005em] whitespace-nowrap transition-colors duration-[120ms] border-b-2 cursor-pointer ${
                      isActive
                        ? "text-navy border-amber"
                        : isOpen
                        ? "text-navy border-primary bg-primary/[0.06]"
                        : "text-on-surface border-transparent hover:text-navy hover:border-primary hover:bg-primary/[0.06]"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full transition-colors duration-[150ms] ${
                        isOpen ? "bg-navy text-white" : "bg-amber text-navy"
                      }`}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 200ms",
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <Link
                    href={tab.href}
                    className={`h-full inline-flex items-center px-2.5 md:px-3.5 text-xs md:text-sm font-bold tracking-[-0.005em] whitespace-nowrap transition-colors duration-[120ms] border-b-2 ${
                      isActive
                        ? "text-navy border-amber"
                        : "text-on-surface border-transparent hover:text-navy hover:border-primary hover:bg-primary/[0.06]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* SECTOR dropdown — full width, responsive grid */}
      {openDrop === "/sektorler" && (
        <div className="absolute top-full left-0 right-0 z-[60] bg-white border-b border-outline-variant shadow-modal">
          <div className="max-w-container mx-auto px-4 md:px-6 py-4">
            <div className="border-b-2 border-primary pb-3 mb-3.5">
              <div className="text-[11px] font-black tracking-[0.1em] text-primary uppercase">
                {"SEKTÖR HABERLERİ"}
              </div>
              <div className="text-xs text-fg-3 mt-1">
                {"Sektör seçerek o alandaki tüm haberleri filtreleyin"}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5 mb-3.5">
              {SECTORS.map((sec, i) => (
                <Link
                  key={sec.href + sec.label}
                  href={sec.href}
                  onClick={() => setOpenDrop(null)}
                  className="flex items-center gap-2.5 px-3 py-[10px] text-on-surface hover:bg-surface-2 transition-colors duration-[120ms] rounded-sm"
                >
                  <span className="text-[10px] font-black text-fg-3 w-5 tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-semibold tracking-[-0.005em]">
                    {sec.label}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/sektorler"
              onClick={() => setOpenDrop(null)}
              className="block border-t border-outline-variant pt-3.5 text-xs font-bold tracking-[0.04em] text-primary hover:underline hover:underline-offset-[3px] text-center"
            >
              {"Tüm Sektörleri Gör"} &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* COUNTRY dropdown — full width, responsive grid */}
      {openDrop === "/ulkeler" && (
        <div className="absolute top-full left-0 right-0 z-[60] bg-white border-b border-outline-variant shadow-modal">
          <div className="max-w-container mx-auto px-4 md:px-6 py-4">
            <div className="border-b-2 border-primary pb-3 mb-3.5">
              <div className="text-[11px] font-black tracking-[0.1em] text-primary uppercase">
                {"AFRİKA ÜLKELERİ"}
              </div>
              <div className="text-xs text-fg-3 mt-1">
                {"Afrika'nın 54 ülkesine ait güncel ekonomi, ticaret ve yatırım haberlerini keşfedin."}
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-0.5 max-h-[50vh] overflow-y-auto pr-1 mb-3.5">
              {COUNTRIES.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  onClick={() => setOpenDrop(null)}
                  className="flex items-center gap-2 px-3 py-2 text-on-surface hover:bg-surface-2 transition-colors duration-[120ms] rounded-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                  <span className="text-[11px] md:text-[12px] font-semibold tracking-[-0.005em] leading-tight">
                    {c.label}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/ulkeler"
              onClick={() => setOpenDrop(null)}
              className="block border-t border-outline-variant pt-3.5 text-xs font-bold tracking-[0.04em] text-primary hover:underline hover:underline-offset-[3px] text-center"
            >
              {"Tüm ülke haberlerini gör"} &rarr;
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
