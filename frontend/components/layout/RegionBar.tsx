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
    return null;
  })();

  return (
    <div className="bg-white border-b border-outline-variant">
      <div className="max-w-container mx-auto px-6 h-10 flex items-center gap-3.5">
        <span className="text-[11px] font-bold tracking-[0.08em] text-navy uppercase shrink-0 pr-3.5 border-r border-outline-variant">
          BÖLGE
        </span>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
          {REGIONS.map(({ slug, label, href }) => {
            const isActive = slug === activeSlug;
            return (
              <Link
                key={slug}
                href={href}
                className={`shrink-0 px-3 py-[5px] text-xs font-semibold tracking-[-0.005em] border rounded-sm whitespace-nowrap transition-colors duration-[120ms] ${
                  isActive
                    ? "bg-navy text-white border-navy"
                    : "bg-transparent text-on-surface border-outline-variant hover:border-navy hover:text-navy"
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
