"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";

const NAV_TABS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  {
    href: "/sektorler",
    label: "Sektörler",
    dropdown: [
      { href: "/sektorler/insaat-muteahhitlik", label: "İnşaat & Müteahhitlik" },
      { href: "/sektorler/enerji", label: "Enerji" },
      { href: "/sektorler/savunma-sanayi", label: "Savunma Sanayi" },
      { href: "/sektorler/madencilik", label: "Madencilik" },
      { href: "/sektorler/tekstil-hazir-giyim", label: "Tekstil & Hazır Giyim" },
      { href: "/sektorler/kozmetik-hijyen", label: "Kozmetik & Hijyen" },
      { href: "/sektorler/demir-celik-sanayi", label: "Demir-Çelik & Sanayi" },
      { href: "/sektorler/tarim-gida", label: "Tarım & Gıda" },
      { href: "/sektorler/otomotiv", label: "Otomotiv" },
      { href: "/sektorler", label: "Daha Fazla Sektör" },
    ],
  },
  { href: "/turk-is-dunyasi", label: "Türk İş Dünyası Afrika'da" },
  { href: "/etkinlikler-fuarlar", label: "Etkinlikler & Fuarlar" },
  { href: "/ulkeler", label: "Ülkeler" },
  { href: "/diger", label: "Diğer" },
  { href: "/ihaleler", label: "İhaleler" },
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = "" }: NavigationProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpenDropdown(true);
  }

  function handleMouseLeave() {
    timerRef.current = setTimeout(() => setOpenDropdown(false), 150);
  }

  return (
    <nav className={className} aria-label="Ana navigasyon">
      <ul className="flex items-center gap-5">
        {NAV_TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));

          if (tab.dropdown) {
            return (
              <li
                key={tab.href}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={tab.href}
                  className={`font-body text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-primary"
                      : "text-on-surface/80 hover:text-primary"
                  }`}
                >
                  {tab.label}
                </Link>

                {openDropdown && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 bg-surface border border-outline-variant rounded-xl shadow-lg min-w-[220px] py-1"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {tab.dropdown.map((item, i) => {
                      const isLast = i === tab.dropdown!.length - 1;
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={() => setOpenDropdown(false)}
                          className={`block px-4 py-2 font-body text-sm transition-colors ${
                            isLast
                              ? "text-primary font-semibold border-t border-outline-variant mt-1 pt-3"
                              : "text-on-surface/80 hover:text-primary hover:bg-surface-container"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`font-body text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-primary"
                    : "text-on-surface/80 hover:text-primary"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
