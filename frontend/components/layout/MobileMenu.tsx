"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/kategori/siyaset", label: "Siyaset" },
  { href: "/kategori/ekonomi", label: "Ekonomi" },
  { href: "/kategori/saglik", label: "Saglik" },
  { href: "/kategori/bilim-teknoloji", label: "Bilim ve Teknoloji" },
  { href: "/kategori/cevre-enerji", label: "Cevre ve Enerji" },
  { href: "/kategori/genel", label: "Genel" },
  { href: "/arama", label: "Ara" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Menuyu kapat" : "Menuyu ac"}
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
            {NAV_LINKS.map(({ href, label }) => (
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
                Giris Yap
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
