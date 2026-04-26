"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_TABS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  { href: "/sektorler", label: "Sektörler" },
  { href: "/turk-is-dunyasi", label: "Türk İş Dünyası Afrika'da" },
  { href: "/etkinlikler-fuarlar", label: "Etkinlikler & Fuarlar" },
  { href: "/ulkeler", label: "Ülkeler" },
  { href: "/diger", label: "Diğer" },
];

const REGION_LINKS = [
  { href: "/bolge/afrika", label: "Tüm Afrika" },
  { href: "/bolge/kuzey-afrika", label: "Kuzey Afrika" },
  { href: "/bolge/bati-afrika", label: "Batı Afrika" },
  { href: "/bolge/orta-afrika", label: "Orta Afrika" },
  { href: "/bolge/dogu-afrika", label: "Doğu Afrika" },
  { href: "/bolge/guney-afrika", label: "Güney Afrika" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
        className="p-2 text-on-surface hover:text-primary transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-surface border-b border-outline-variant shadow-card z-50">
          <ul className="container mx-auto px-4 py-4 flex flex-col gap-1">
            <li className="pb-1">
              <span className="font-body text-xs font-semibold text-on-surface/40 uppercase tracking-wider">
                Kategoriler
              </span>
            </li>
            {NAV_TABS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 font-body text-sm font-medium text-on-surface hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-3 pb-1 border-t border-outline-variant mt-1">
              <span className="font-body text-xs font-semibold text-on-surface/40 uppercase tracking-wider">
                Bölgeler
              </span>
            </li>
            {REGION_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 font-body text-sm font-medium text-on-surface hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-3 border-t border-outline-variant mt-1">
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="block py-2.5 font-body text-sm font-medium text-primary"
              >
                Giriş Yap
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
