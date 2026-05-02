import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/queries/articles";
import CategoryBadge from "./CategoryBadge";
import ReadingTime from "./ReadingTime";
import { formatDateShort } from "@/lib/utils";

const SECTOR_LABELS: Record<string, string> = {
  "insaat-muteahhitlik": "İnşaat",
  "enerji": "Enerji",
  "savunma-sanayi": "Savunma",
  "madencilik": "Madencilik",
  "tekstil-hazir-giyim": "Tekstil",
  "kozmetik-hijyen": "Kozmetik",
  "demir-celik-sanayi": "Demir-Çelik",
  "tarim-gida": "Tarım & Gıda",
  "otomotiv": "Otomotiv",
  "ambalaj-geri-donusum": "Ambalaj",
  "bankacilik-finans": "Bankacılık",
  "beyaz-esya-ev-aletleri": "Beyaz Eşya",
  "cimento-insaat-malzemeleri": "Çimento",
  "ev-tekstili-hali": "Ev Tekstili",
  "gayrimenkul-konut": "Gayrimenkul",
  "havacilik-sivil-havacilik": "Havacılık",
  "hvac-r": "HVAC-R",
  "kimya-petrokimya": "Kimya",
  "lojistik-tasimaci": "Lojistik",
  "makine-yedek-parca": "Makine",
  "mobilya-dekorasyon": "Mobilya",
  "perakende-e-ticaret": "Perakende",
  "saglik-saglik-turizmi": "Sağlık",
  "teknoloji-yazilim": "Teknoloji",
  "turizm-otelcilik": "Turizm",
  "diger-sektor": "Diğer Sektörler",
};

const REGION_LABELS: Record<string, string> = {
  "afrika": "Afrika",
  "kuzey-afrika": "Kuzey Afrika",
  "bati-afrika": "Batı Afrika",
  "orta-afrika": "Orta Afrika",
  "dogu-afrika": "Doğu Afrika",
  "guney-afrika": "Güney Afrika",
};

const AFRICAN_COUNTRIES = new Set([
  "Mısır","Fas","Cezayir","Tunus","Libya","Sudan","Moritanya",
  "Nijerya","Gana","Senegal","Fildişi Sahili","Mali","Burkina Faso","Benin","Togo","Gine","Sierra Leone","Liberya","Gambiya","Gine-Bissau","Yeşil Burun Adaları","Nijer",
  "Kenya","Etiyopya","Tanzanya","Uganda","Ruanda","Burundi","Somali","Cibuti","Eritre","Güney Sudan","Komorlar","Seyşeller","Madagaskar","Mauritius",
  "DR Kongo","Kongo Cumhuriyeti","Kamerun","Çad","Orta Afrika Cumhuriyeti","Gabon","Ekvator Ginesi","Sao Tome ve Principe","Angola",
  "Güney Afrika Cumhuriyeti","Zimbabve","Botsvana","Namibya","Mozambik","Zambiya","Malavi","Lesoto","Esvatini",
]);

function getBadgeLabel(article: Article): { label: string; href: string } | null {
  const nav = article.nav_tab_slug;
  const sectors = (article.sector_slugs as string[] | null) ?? [];
  const region = article.region_slug;
  const hashtags = (article.hashtags as string[] | null) ?? [];

  if (nav === "sektorler" && sectors.length > 0) {
    const slug = sectors[0];
    return { label: SECTOR_LABELS[slug] ?? slug, href: `/sektorler/${slug}` };
  }
  if (nav === "ulkeler") {
    const country = hashtags.find(t => AFRICAN_COUNTRIES.has(t));
    if (country) {
      const regionHref = region && region !== "afrika" ? `/bolge/${region}` : "/ulkeler";
      return { label: country, href: regionHref };
    }
    if (region && region !== "afrika") {
      return { label: REGION_LABELS[region] ?? region, href: `/bolge/${region}` };
    }
  }
  if (nav) {
    const NAV_LABELS: Record<string, string> = {
      firsatlar: "Fırsatlar",
      "pazarlar-ekonomi": "Pazarlar & Ekonomi",
      "ticaret-ihracat": "Ticaret & İhracat",
      sektorler: "Sektörler",
      "turk-is-dunyasi": "Türk İş Dünyası",
      "etkinlikler-fuarlar": "Etkinlikler & Fuarlar",
      ulkeler: "Ülkeler",
      diger: "Diğer",
    };
    return { label: NAV_LABELS[nav] ?? nav, href: `/${nav}` };
  }
  return null;
}

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const href = `/haber/${article.slug}`;
  const hashtags = Array.from(new Set((article.hashtags as string[] | null) ?? []));

  return (
    <article className="group flex flex-col rounded-xl shadow-card bg-surface-container overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* Image */}
      <Link href={href} className="block overflow-hidden aspect-video relative bg-outline-variant">
        {article.featured_image_url ? (
          <Image
            src={article.featured_image_url}
            alt={article.title_tr ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f2ece4 0%, #e8dfd5 50%, #d8d0c8 100%)" }}>
            <svg viewBox="0 0 64 64" className="w-12 h-12 opacity-30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="12" width="48" height="40" rx="4" stroke="#3a302a" strokeWidth="2.5"/>
              <path d="M8 22h48" stroke="#3a302a" strokeWidth="2.5"/>
              <circle cx="20" cy="35" r="6" stroke="#3a302a" strokeWidth="2"/>
              <path d="M28 40l6-8 5 6 3-4 7 10H8l8-10 4 6z" fill="#3a302a" fillOpacity="0.4"/>
            </svg>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badge */}
        <div className="flex flex-wrap gap-1.5">
          {(() => {
            const badge = getBadgeLabel(article);
            if (!badge) return null;
            const classes = "inline-block text-xs font-body font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full";
            return <Link href={badge.href} className={classes}>{badge.label}</Link>;
          })()}
        </div>

        {/* Title */}
        <Link href={href}>
          <h2 className="font-headline text-lg leading-snug text-on-surface line-clamp-3 hover:text-primary transition-colors">
            {article.title_tr}
          </h2>
        </Link>

        {/* Excerpt */}
        {article.excerpt_tr && (
          <p className="font-body text-sm text-on-surface/70 line-clamp-2 leading-relaxed">
            {article.excerpt_tr}
          </p>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.slice(0, 10).map((tag) => (
              <span
                key={tag}
                className="font-body text-[10px] text-on-surface/50 bg-outline-variant/60 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-outline-variant">
          <div className="flex flex-col gap-0.5">
            {article.author_original && (
              <span className="font-body text-xs text-on-surface/60 truncate max-w-[140px]">
                {article.author_original}
              </span>
            )}
            <time
              dateTime={article.published_at}
              className="font-body text-xs text-on-surface/50"
            >
              {formatDateShort(article.published_at)}
            </time>
          </div>
          <ReadingTime minutes={article.reading_time_minutes} />
        </div>
      </div>
    </article>
  );
}
