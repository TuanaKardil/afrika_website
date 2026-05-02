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
        className={`shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors ${
          activeSlug === null
            ? "bg-primary text-white"
            : "bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10"
        }`}
      >
        Tümü
      </Link>
      {navTabs.map((tab) => (
        <Link
          key={tab.slug}
          href={`/${tab.slug}`}
          className={`shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors ${
            activeSlug === tab.slug
              ? "bg-primary text-white"
              : "bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10"
          }`}
        >
          {tab.name_tr}
        </Link>
      ))}
    </nav>
  );
}
