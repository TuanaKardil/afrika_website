import Link from "next/link";

const NAV_LINKS = [
  { href: "/kategori/siyaset", label: "Siyaset" },
  { href: "/kategori/ekonomi", label: "İş Dünyası ve Ekonomi" },
  { href: "/kategori/saglik", label: "Sağlık" },
  { href: "/kategori/bilim-teknoloji", label: "Bilim ve Teknoloji" },
  { href: "/kategori/cevre-enerji", label: "Çevre ve Enerji" },
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = "" }: NavigationProps) {
  return (
    <nav className={className} aria-label="Ana navigasyon">
      <ul className="flex items-center gap-5">
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="font-body text-sm font-medium text-on-surface/80 hover:text-primary transition-colors whitespace-nowrap"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
