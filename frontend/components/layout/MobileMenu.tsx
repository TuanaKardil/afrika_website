"use client";
import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { useIsLoggedIn } from "@/lib/auth/useIsLoggedIn";

const NAV_TABS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  { href: "/sektorler", label: "Sektör Haberleri" },
  { href: "/ulkeler", label: "Ülkeler" },
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
  const isLoggedIn = useIsLoggedIn();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
        className="p-2 text-white/80 hover:text-white transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-navy border-b border-white/10 shadow-dropdown z-50">
          <ul className="max-w-container mx-auto px-6 py-4 flex flex-col gap-0.5">
            <li className="pb-2">
              <span className="text-amber text-[11px] font-black tracking-widest uppercase">
                {"KATEGORİLER"}
              </span>
            </li>
            {NAV_TABS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-white/85 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-4 pb-2 border-t border-white/10 mt-2">
              <span className="text-amber text-[11px] font-black tracking-widest uppercase">
                {"BÖLGELER"}
              </span>
            </li>
            {REGION_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-white/85 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-4 border-t border-white/10 mt-2 pb-2">
              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/panel"
                    onClick={() => setOpen(false)}
                    className="block py-2.5 text-sm font-semibold text-amber hover:text-amber-dark transition-colors"
                  >
                    {"Hesabım"}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      onClick={() => setOpen(false)}
                      className="py-2.5 text-sm font-semibold text-white/60 hover:text-white transition-colors"
                    >
                      {"Çıkış Yap"}
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/giris"
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-amber hover:text-amber-dark transition-colors"
                >
                  {"Giriş Yap"}
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
