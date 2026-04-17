import Link from "next/link";

const NAV_LINKS = [
  { href: "/kategori/siyaset", label: "Siyaset" },
  { href: "/kategori/ekonomi", label: "Ekonomi" },
  { href: "/kategori/saglik", label: "Saglik" },
  { href: "/kategori/bilim-teknoloji", label: "Bilim" },
  { href: "/kategori/cevre-enerji", label: "Cevre" },
  { href: "/kategori/genel", label: "Genel" },
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = "" }: NavigationProps) {
  return (
    <nav className={className} aria-label="Ana navigasyon">
      <ul className="flex items-center gap-6">
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="font-body text-sm font-medium text-on-surface/80 hover:text-primary transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
