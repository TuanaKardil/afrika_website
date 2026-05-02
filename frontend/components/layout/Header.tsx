import { Suspense } from "react";
import Link from "next/link";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";
import RegionBar from "./RegionBar";

export default function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* Navy main bar */}
      <div className="bg-navy">
        <div className="max-w-container mx-auto px-6 h-16 flex items-center gap-6">
          {/* Logo wordmark */}
          <Link href="/" className="flex items-center shrink-0" aria-label="Afrika Haberleri Ana Sayfa">
            <span className="w-1 h-7 bg-amber mr-2.5 shrink-0" />
            <span className="text-white font-black text-xl tracking-[-0.02em] leading-none">{"AFRİKA"}</span>
            <span className="text-white font-black text-xl tracking-[-0.02em] leading-none ml-1.5">{"HABERLERİ"}</span>
          </Link>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3.5 ml-auto shrink-0">
            <Link
              href="/kayit"
              className="bg-amber text-navy text-xs font-black tracking-[0.06em] px-3.5 py-2 rounded-sm hover:bg-amber-dark transition-colors whitespace-nowrap"
            >
              BÜLTENE ABONE OL
            </Link>
            <Link
              href="/giris"
              className="text-white/90 text-sm font-semibold hover:text-white transition-colors whitespace-nowrap"
            >
              {"Giriş Yap"}
            </Link>
          </div>

          <MobileMenu />
        </div>
      </div>

      {/* White horizontal nav */}
      <Navigation />

      {/* Region ticker */}
      <Suspense fallback={<div className="h-9 bg-surface-2 border-b border-outline-variant" />}>
        <RegionBar />
      </Suspense>
    </header>
  );
}
