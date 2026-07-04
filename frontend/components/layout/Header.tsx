import { Suspense } from "react";
import Link from "next/link";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";
import MobileSearchOverlay from "./MobileSearchOverlay";
import HeaderSearch from "./HeaderSearch";
import HeaderAuth from "./HeaderAuth";
import RegionBar from "./RegionBar";

// IMPORTANT: keep this a cookie-free server component. Reading cookies()
// here (root layout) forces EVERY page dynamic and kills ISR/SSG caching
// site-wide; auth state is resolved client-side in HeaderAuth/MobileMenu.
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

          {/* Actions — pushed to the right; search bar is part of this group */}
          <div className="ml-auto flex items-center gap-3 md:gap-4 shrink-0">
            {/* Search bar — desktop only */}
            <HeaderSearch />
            <HeaderAuth />
            <MobileSearchOverlay />
            <MobileMenu />
          </div>
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
