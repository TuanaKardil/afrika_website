import Link from "next/link";

const NAV_TAB_LINKS = [
  { href: "/firsatlar", label: "Fırsatlar" },
  { href: "/pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { href: "/ticaret-ihracat", label: "Ticaret & İhracat" },
  { href: "/sektorler", label: "Sektör Haberleri" },
  { href: "/etkinlikler-fuarlar", label: "Etkinlikler & Fuarlar" },
  { href: "/ulkeler", label: "Ülkeler" },
  { href: "/ihaleler", label: "İhaleler" },
];

const REGION_LINKS = [
  { href: "/bolge/afrika", label: "Tüm Afrika" },
  { href: "/bolge/kuzey-afrika", label: "Kuzey Afrika" },
  { href: "/bolge/bati-afrika", label: "Batı Afrika" },
  { href: "/bolge/orta-afrika", label: "Orta Afrika" },
  { href: "/bolge/dogu-afrika", label: "Doğu Afrika" },
  { href: "/bolge/guney-afrika", label: "Güney Afrika" },
];

const CORPORATE_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/kayit", label: "Bülten" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-[60px]">
      <div className="max-w-container mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center mb-3">
            <span className="w-1 h-[22px] bg-amber mr-2.5 shrink-0" />
            <span className="text-white font-black text-[17px] tracking-[-0.02em] leading-none">{"AFRİKA"}</span>
            <span className="text-amber font-black text-[17px] tracking-[-0.02em] leading-none ml-1.5">{"HABERLERİ"}</span>
          </div>
          <p className="text-sm text-white/65 leading-[1.6] max-w-xs">
            {"Türk iş dünyası için Afrika pazarlarından editöryal haberler. Her sabah Türkiye saatiyle 06:00"}&apos;{"da güncellenir."}
          </p>
        </div>

        {/* Categories */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] text-amber mb-3.5 uppercase">{"KATEGORİLER"}</div>
          {NAV_TAB_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="block text-sm font-medium text-white/85 hover:text-white transition-colors mb-2">
              {label}
            </Link>
          ))}
        </div>

        {/* Regions */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] text-amber mb-3.5 uppercase">{"BÖLGELER"}</div>
          {REGION_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="block text-sm font-medium text-white/85 hover:text-white transition-colors mb-2">
              {label}
            </Link>
          ))}
        </div>

        {/* Corporate */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] text-amber mb-3.5 uppercase">KURUMSAL</div>
          {CORPORATE_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="block text-sm font-medium text-white/85 hover:text-white transition-colors mb-2">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/10">
        <div className="max-w-container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-semibold text-white/50 tracking-[0.06em] uppercase">
          <span>&copy; {new Date().getFullYear()} {"AFRİKA HABERLERİ. TÜM HAKLARI SAKLIDIR."}</span>
          <span className="text-white/40">{"GİZLİLİK"} &bull; {"KULLANIM KOŞULLARI"} &bull; {"ÇEREZ POLİTİKASI"}</span>
        </div>
      </div>
    </footer>
  );
}
