import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  siyaset: "Siyaset",
  ekonomi: "Ekonomi",
  saglik: "Saglik",
  "bilim-teknoloji": "Bilim ve Teknoloji",
  "cevre-enerji": "Cevre ve Enerji",
  genel: "Genel",
};

interface CategoryBadgeProps {
  slug: string;
  linkable?: boolean;
  className?: string;
}

export default function CategoryBadge({
  slug,
  linkable = true,
  className = "",
}: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[slug] ?? slug;
  const classes = `inline-block text-xs font-body font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full ${className}`;

  if (linkable) {
    return (
      <Link href={`/kategori/${slug}`} className={classes}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}
