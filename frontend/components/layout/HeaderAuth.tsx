"use client";

import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { useIsLoggedIn } from "@/lib/auth/useIsLoggedIn";

export default function HeaderAuth() {
  const loggedIn = useIsLoggedIn();

  if (loggedIn) {
    return (
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
    );
  }

  return (
    <Link
      href="/giris"
      className="text-white/90 text-xs md:text-sm font-semibold hover:text-white transition-colors whitespace-nowrap"
    >
      {"Giriş Yap"}
    </Link>
  );
}
