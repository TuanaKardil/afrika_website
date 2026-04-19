import Link from "next/link";

const CATEGORY_LINKS = [
  { href: "/kategori/siyaset", label: "Siyaset" },
  { href: "/kategori/ekonomi", label: "İş Dünyası ve Ekonomi" },
  { href: "/kategori/saglik", label: "Sağlık" },
  { href: "/kategori/bilim-teknoloji", label: "Bilim ve Teknoloji" },
  { href: "/kategori/cevre-enerji", label: "Çevre ve Enerji" },
  { href: "/kategori/genel", label: "Genel" },
];

const REGION_LINKS = [
  { href: "/bolge/afrika", label: "Tüm Afrika" },
  { href: "/bolge/kuzey-afrika", label: "Kuzey Afrika" },
  { href: "/bolge/bati-afrika", label: "Batı Afrika" },
  { href: "/bolge/orta-afrika", label: "Orta Afrika" },
  { href: "/bolge/dogu-afrika", label: "Doğu Afrika" },
  { href: "/bolge/guney-afrika", label: "Güney Afrika" },
];

export default function Footer() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="font-headline text-xl font-semibold text-primary">
              Afrika Haberleri
            </Link>
            <p className="font-body text-sm text-on-surface/60 mt-2 leading-relaxed">
              Afrika&apos;dan son dakika haberleri Türkçe olarak.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-body text-sm font-semibold text-on-surface uppercase tracking-wide mb-3">
              Kategoriler
            </h3>
            <ul className="space-y-2">
              {CATEGORY_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body text-sm text-on-surface/70 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Regions */}
          <div>
            <h3 className="font-body text-sm font-semibold text-on-surface uppercase tracking-wide mb-3">
              Bölgeler
            </h3>
            <ul className="space-y-2">
              {REGION_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body text-sm text-on-surface/70 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-outline-variant text-center">
          <p className="font-body text-xs text-on-surface/40">
            &copy; {new Date().getFullYear()} Afrika Haberleri. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
