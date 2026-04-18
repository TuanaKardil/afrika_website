import Link from "next/link";
import type { Category } from "@/lib/queries/categories";

interface CategoryFilterProps {
  categories: Category[];
  activeSlug: string | null;
}

export default function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Kategori filtresi"
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
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/kategori/${cat.slug}`}
          className={`shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors ${
            activeSlug === cat.slug
              ? "bg-primary text-white"
              : "bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10"
          }`}
        >
          {cat.name_tr}
        </Link>
      ))}
    </nav>
  );
}
