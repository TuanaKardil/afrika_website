"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const REGIONS = [
  { slug: "afrika", label: "Tüm Afrika", href: "/bolge/afrika" },
  { slug: "kuzey-afrika", label: "Kuzey Afrika", href: "/bolge/kuzey-afrika" },
  { slug: "bati-afrika", label: "Batı Afrika", href: "/bolge/bati-afrika" },
  { slug: "orta-afrika", label: "Orta Afrika", href: "/bolge/orta-afrika" },
  { slug: "dogu-afrika", label: "Doğu Afrika", href: "/bolge/dogu-afrika" },
  { slug: "guney-afrika", label: "Güney Afrika", href: "/bolge/guney-afrika" },
];

export default function RegionBar() {
  const pathname = usePathname();

  const activeSlug = (() => {
    const match = pathname.match(/^\/bolge\/([\w-]+)/);
    if (match) return match[1];
    return "afrika";
  })();

  return (
    <div className="bg-surface-container border-b border-outline-variant">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {REGIONS.map(({ slug, label, href }) => {
            const isActive = slug === activeSlug;
            return (
              <Link
                key={slug}
                href={href}
                className={`shrink-0 px-4 py-1 rounded-full font-body text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-on-surface/70 hover:text-primary hover:bg-primary/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
