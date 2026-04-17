import Link from "next/link";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4 relative">
        {/* Logo */}
        <Link
          href="/"
          className="font-headline text-xl font-semibold text-primary shrink-0"
        >
          Afrika Haberleri
        </Link>

        {/* Desktop nav */}
        <Navigation className="hidden md:flex" />

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/arama"
            aria-label="Haberlerde ara"
            className="p-2 text-on-surface/70 hover:text-primary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <Link
            href="/giris"
            className="font-body text-sm font-medium text-on-surface/80 hover:text-primary transition-colors"
          >
            Giris Yap
          </Link>
        </div>

        {/* Mobile menu */}
        <MobileMenu />
      </div>
    </header>
  );
}
