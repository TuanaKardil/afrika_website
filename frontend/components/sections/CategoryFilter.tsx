import Link from "next/link";
import type { NavTab } from "@/lib/queries/nav_tabs";

interface CategoryFilterProps {
  navTabs: NavTab[];
  activeSlug: string | null;
}

export default function CategoryFilter({ navTabs, activeSlug }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Sekme filtresi"
      className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none"
    >
      <Link
        href="/"
        className={`shrink-0 px-4 py-1.5 rounded-sm text-sm font-semibold transition-colors ${
          activeSlug === null
            ? "bg-navy text-white"
            : "bg-surface-container border border-outline-variant text-on-surface/70 hover:text-on-surface"
        }`}
      >
        {"Tümü"}
      </Link>
      {navTabs.map((tab) => (
        <Link
          key={tab.slug}
          href={`/${tab.slug}`}
          className={`shrink-0 px-4 py-1.5 rounded-sm text-sm font-semibold transition-colors ${
            activeSlug === tab.slug
              ? "bg-navy text-white"
              : "bg-surface-container border border-outline-variant text-on-surface/70 hover:text-on-surface"
          }`}
        >
          {tab.name_tr}
        </Link>
      ))}
    </nav>
  );
}
