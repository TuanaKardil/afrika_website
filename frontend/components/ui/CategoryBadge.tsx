import Link from "next/link";
import { resolveCategory } from "@/lib/labels";

interface CategoryBadgeProps {
  slug: string;
  sectorSlugs?: string[];
  linkable?: boolean;
  className?: string;
}

export default function CategoryBadge({
  slug,
  sectorSlugs = [],
  linkable = true,
  className = "",
}: CategoryBadgeProps) {
  const label = resolveCategory(slug, sectorSlugs);
  if (!label) return null;
  const classes = `inline-block text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-sm ${className}`;

  if (linkable) {
    return (
      <Link href={`/${slug}`} className={classes}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}
