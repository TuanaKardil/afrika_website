import Link from "next/link";

const NAV_TAB_LABELS: Record<string, string> = {
  firsatlar: "Fırsatlar",
  "pazarlar-ekonomi": "Pazarlar & Ekonomi",
  "ticaret-ihracat": "Ticaret & İhracat",
  sektorler: "Sektörler",
  "turk-is-dunyasi": "Türk İş Dünyası",
  "etkinlikler-fuarlar": "Etkinlikler & Fuarlar",
  ulkeler: "Ülkeler",
  diger: "Diğer",
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
  const label = NAV_TAB_LABELS[slug] ?? slug;
  const classes = `inline-block text-xs font-body font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full ${className}`;

  if (linkable) {
    return (
      <Link href={`/${slug}`} className={classes}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}
