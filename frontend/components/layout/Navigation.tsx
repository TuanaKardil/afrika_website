"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";

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
  { href: "/ulkeler?ulke=angola", label: "Angola" },
  { href: "/ulkeler?ulke=benin", label: "Benin" },
  { href: "/ulkeler?ulke=botsvana", label: "Botsvana" },
  { href: "/ulkeler?ulke=burkina-faso", label: "Burkina Faso" },
  { href: "/ulkeler?ulke=burundi", label: "Burundi" },
  { href: "/ulkeler?ulke=cezayir", label: "Cezayir" },
  { href: "/ulkeler?ulke=cibuti", label: "Cibuti" },
  { href: "/ulkeler?ulke=cad", label: "Çad" },
  { href: "/ulkeler?ulke=demokratik-kongo", label: "Demokratik Kongo" },
  { href: "/ulkeler?ulke=ekvator-ginesi", label: "Ekvator Ginesi" },
  { href: "/ulkeler?ulke=eritre", label: "Eritre" },
  { href: "/ulkeler?ulke=eswatini", label: "Eswatini" },
  { href: "/ulkeler?ulke=etiyopya", label: "Etiyopya" },
  { href: "/ulkeler?ulke=fas", label: "Fas" },
  { href: "/ulkeler?ulke=fildisi-sahili", label: "Fildişi Sahili" },
  { href: "/ulkeler?ulke=gabon", label: "Gabon" },
  { href: "/ulkeler?ulke=gambiya", label: "Gambiya" },
  { href: "/ulkeler?ulke=gana", label: "Gana" },
  { href: "/ulkeler?ulke=gine", label: "Gine" },
  { href: "/ulkeler?ulke=gine-bissau", label: "Gine-Bissau" },
  { href: "/ulkeler?ulke=guney-afrika", label: "Güney Afrika" },
  { href: "/ulkeler?ulke=guney-sudan", label: "Güney Sudan" },
  { href: "/ulkeler?ulke=kamerun", label: "Kamerun" },
  { href: "/ulkeler?ulke=kenya", label: "Kenya" },
  { href: "/ulkeler?ulke=komorlar", label: "Komorlar" },
  { href: "/ulkeler?ulke=kongo-cumhuriyeti", label: "Kongo Cumhuriyeti" },
  { href: "/ulkeler?ulke=lesoto", label: "Lesoto" },
  { href: "/ulkeler?ulke=liberya", label: "Liberya" },
  { href: "/ulkeler?ulke=libya", label: "Libya" },
  { href: "/ulkeler?ulke=madagaskar", label: "Madagaskar" },
  { href: "/ulkeler?ulke=malavi", label: "Malavi" },
  { href: "/ulkeler?ulke=mali", label: "Mali" },
  { href: "/ulkeler?ulke=mauritius", label: "Mauritius" },
  { href: "/ulkeler?ulke=misir", label: "Mısır" },
  { href: "/ulkeler?ulke=moritanya", label: "Moritanya" },
  { href: "/ulkeler?ulke=mozambik", label: "Mozambik" },
  { href: "/ulkeler?ulke=namibya", label: "Namibya" },
  { href: "/ulkeler?ulke=nijer", label: "Nijer" },
  { href: "/ulkeler?ulke=nijerya", label: "Nijerya" },
  { href: "/ulkeler?ulke=orta-afrika-cumhuriyeti", label: "Orta Afrika Cum." },
  { href: "/ulkeler?ulke=ruanda", label: "Ruanda" },
  { href: "/ulkeler?ulke=sao-tome-ve-principe", label: "Sao Tome & Principe" },
  { href: "/ulkeler?ulke=senegal", label: "Senegal" },
  { href: "/ulkeler?ulke=seyseller", label: "Seyşeller" },
  { href: "/ulkeler?ulke=sierra-leone", label: "Sierra Leone" },
  { href: "/ulkeler?ulke=somali", label: "Somali" },
  { href: "/ulkeler?ulke=sudan", label: "Sudan" },
  { href: "/ulkeler?ulke=tanzanya", label: "Tanzanya" },
  { href: "/ulkeler?ulke=togo", label: "Togo" },
  { href: "/ulkeler?ulke=tunus", label: "Tunus" },
  { href: "/ulkeler?ulke=uganda", label: "Uganda" },
  { href: "/ulkeler?ulke=yesil-burun-adalari", label: "Yeşil Burun Adaları" },
  { href: "/ulkeler?ulke=zambiya", label: "Zambiya" },
  { href: "/ulkeler?ulke=zimbabve", label: "Zimbabve" },
];

const NAV_TABS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  { href: "/sektorler", label: "Sektör Haberleri", hasSectorDrop: true },
  { href: "/turk-is-dunyasi", label: "Türk İş Dünyası" },
  { href: "/etkinlikler-fuarlar", label: "Etkinlikler & Fuarlar" },
  { href: "/ulkeler", label: "Ülkeler", hasCountryDrop: true },
  { href: "/ihaleler", label: "İhaleler" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter(slug: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpenDrop(slug);
  }

  function handleLeave() {
    timerRef.current = setTimeout(() => setOpenDrop(null), 150);
  }

  return (
    <nav className="hidden md:block bg-white border-b border-outline-variant overflow-visible" aria-label="Ana navigasyon">
      <div className="max-w-container mx-auto px-6 overflow-visible">
        <ul className="flex items-center gap-2 h-[52px] overflow-visible" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {NAV_TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/" && pathname.startsWith(tab.href));
            const hasDrop = tab.hasSectorDrop || tab.hasCountryDrop;
            const isOpen = openDrop === tab.href;

            return (
              <li
                key={tab.href}
                className="relative h-full flex items-center"
                onMouseEnter={() => { if (hasDrop) handleEnter(tab.href); }}
                onMouseLeave={() => { if (hasDrop) handleLeave(); }}
              >
                <Link
                  href={tab.href}
                  className={`h-full inline-flex items-center gap-2 px-3.5 text-sm font-bold tracking-[-0.005em] whitespace-nowrap transition-colors duration-[120ms] border-b-2 ${
                    isActive
                      ? "text-navy border-amber"
                      : isOpen
                      ? "text-navy border-primary bg-primary/[0.06]"
                      : "text-on-surface border-transparent hover:text-navy hover:border-primary hover:bg-primary/[0.06]"
                  }`}
                >
                  {tab.label}
                  {hasDrop && (
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
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  )}
                </Link>

                {/* SECTOR mega-dropdown */}
                {tab.hasSectorDrop && isOpen && (
                  <div
                    className="absolute top-full left-0 pt-2 z-[60]"
                    onMouseEnter={() => handleEnter(tab.href)}
                    onMouseLeave={handleLeave}
                  >
                    <div className="absolute top-[2px] left-[30px] w-[14px] h-[14px] bg-white border border-outline-variant border-r-0 border-b-0 rotate-45 z-[61]" />
                    <div className="relative bg-white border border-outline-variant shadow-modal w-[560px] p-5 z-[60]">
                      <div className="border-b-2 border-primary pb-3 mb-3.5">
                        <div className="text-[11px] font-black tracking-[0.1em] text-primary uppercase">
                          {"SEKTÖR HABERLERİ"}
                        </div>
                        <div className="text-xs text-fg-3 mt-1">
                          {"Sektör seçerek o alandaki tüm haberleri filtreleyin"}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-0.5 mb-3.5">
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

                {/* COUNTRY mega-dropdown */}
                {tab.hasCountryDrop && isOpen && (
                  <div
                    className="absolute top-full right-0 pt-2 z-[60]"
                    onMouseEnter={() => handleEnter(tab.href)}
                    onMouseLeave={handleLeave}
                  >
                    <div className="absolute top-[2px] right-[30px] w-[14px] h-[14px] bg-white border border-outline-variant border-r-0 border-b-0 rotate-45 z-[61]" />
                    <div className="relative bg-white border border-outline-variant shadow-modal w-[680px] p-5 z-[60]">
                      <div className="border-b-2 border-primary pb-3 mb-3.5">
                        <div className="text-[11px] font-black tracking-[0.1em] text-primary uppercase">
                          {"AFRİKA ÜLKELERİ"}
                        </div>
                        <div className="text-xs text-fg-3 mt-1">
                          {"54 ülke — ülkeye tıklayarak o ülkeye ait haberleri görün"}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-0.5 max-h-[288px] overflow-y-auto pr-1 mb-3.5">
                        {COUNTRIES.map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            onClick={() => setOpenDrop(null)}
                            className="flex items-center gap-2 px-3 py-2 text-on-surface hover:bg-surface-2 transition-colors duration-[120ms] rounded-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                            <span className="text-[12px] font-semibold tracking-[-0.005em] leading-tight">
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
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
