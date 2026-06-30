import { Suspense } from "react";
import Link from "next/link";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";
import MobileSearchOverlay from "./MobileSearchOverlay";
import HeaderSearch from "./HeaderSearch";
import RegionBar from "./RegionBar";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/lib/auth/actions";

export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

          {/* Search bar — desktop only, sits between logo and actions */}
          <HeaderSearch />

          {/* Actions */}
          <div className="ml-auto md:ml-6 flex items-center gap-2 md:gap-3.5 shrink-0">
            {user ? (
              <>
                <Link
                  href="/panel"
                  className="text-white/90 text-xs md:text-sm font-semibold hover:text-white transition-colors whitespace-nowrap"
                >
                  {"Hesabım"}
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-white/60 text-xs md:text-sm font-semibold hover:text-white transition-colors whitespace-nowrap"
                  >
                    {"Çıkış Yap"}
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/giris"
                className="text-white/90 text-xs md:text-sm font-semibold hover:text-white transition-colors whitespace-nowrap"
              >
                {"Giriş Yap"}
              </Link>
            )}
            <MobileSearchOverlay />
            <MobileMenu isLoggedIn={!!user} />
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
