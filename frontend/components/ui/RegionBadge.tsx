import Link from "next/link";

const REGION_LABELS: Record<string, string> = {
  afrika: "Afrika",
  "kuzey-afrika": "Kuzey Afrika",
  "bati-afrika": "Bati Afrika",
  "orta-afrika": "Orta Afrika",
  "dogu-afrika": "Dogu Afrika",
  "guney-afrika": "Guney Afrika",
};

interface RegionBadgeProps {
  slug: string;
  linkable?: boolean;
  className?: string;
}

export default function RegionBadge({
  slug,
  linkable = true,
  className = "",
}: RegionBadgeProps) {
  const label = REGION_LABELS[slug] ?? slug;
  const classes = `inline-block text-xs font-body font-medium text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full ${className}`;

  if (linkable) {
    return (
      <Link href={`/bolge/${slug}`} className={classes}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}
