import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTenderBySlug,
  getTendersByCategory,
  getAllTenderSlugs,
  getTenderStatus,
  type Tender,
} from "@/lib/queries/tenders";
import { sanitizeArticleContent } from "@/lib/sanitize";
import { formatDate, formatDateShort } from "@/lib/utils";
import CountdownDisplay from "@/components/ui/CountdownDisplay";
import TenderCard from "@/components/ui/TenderCard";

export const revalidate = 1800;

interface TenderPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAllTenderSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: TenderPageProps): Promise<Metadata> {
  const tender = await getTenderBySlug(params.slug);
  if (!tender) return {};
  const title = tender.title_tr ?? tender.title_original ?? "";
  const description = tender.description_tr ?? tender.description_original ?? "";
  return {
    title,
    description: description.slice(0, 200),
  };
}

function formatBudget(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}Mr`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString("tr-TR")}`;
}

function getDeadlineProgress(tender: Tender): number {
  if (!tender.deadline_at) return 0;
  const deadlineMs = new Date(tender.deadline_at).getTime();
  const publishedMs = tender.published_at
    ? new Date(tender.published_at).getTime()
    : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const totalDuration = deadlineMs - publishedMs;
  if (totalDuration <= 0) return 100;
  const elapsed = Date.now() - publishedMs;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

function progressBarColor(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct > 60) return "bg-amber-500";
  return "bg-green-500";
}

interface TimelineRowProps {
  label: string;
  value: string | null;
}

function TimelineRow({ label, value }: TimelineRowProps) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      <div>
        <p className="font-body text-xs text-on-surface/50 uppercase tracking-wide">{label}</p>
        <p className="font-body text-sm text-on-surface font-medium">
          {formatDate(value)}
        </p>
      </div>
    </div>
  );
}

export default async function TenderDetailPage({ params }: TenderPageProps) {
  const tender = await getTenderBySlug(params.slug);
  if (!tender || !tender.title_tr || tender.is_suppressed) notFound();

  const status = getTenderStatus(tender);
  const progress = getDeadlineProgress(tender);
  const safeDescription = sanitizeArticleContent(tender.description_tr ?? "");

  // Fetch similar tenders (same category, max 4 excluding current)
  const similarTenders =
    tender.category_slug
      ? (await getTendersByCategory(tender.category_slug, 1)).tenders
          .filter((t) => t.id !== tender.id)
          .slice(0, 4)
      : [];

  const statusLabels = {
    active: { label: "Aktif", classes: "bg-green-100 text-green-700" },
    planned: { label: "Planlandı", classes: "bg-amber-100 text-amber-700" },
    expired: { label: "Suresi Doldu", classes: "bg-red-100 text-red-600" },
  };
  const statusMeta = statusLabels[status];

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Sayfa yolu" className="mb-6 flex items-center gap-2 font-body text-sm text-on-surface/50">
        <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
        <span>/</span>
        <a href="/ihaleler" className="hover:text-primary transition-colors">Ihaleler</a>
        <span>/</span>
        <span className="text-on-surface/30 truncate max-w-[200px]">{tender.title_tr}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Left column: main content */}
        <div className="min-w-0">
          {/* Status + category badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`font-body text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusMeta.classes}`}>
              {statusMeta.label}
            </span>
            {tender.category_slug && (
              <a
                href={`/ihaleler/kategori/${tender.category_slug}`}
                className="font-body text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                {tender.category_slug}
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="font-headline text-2xl md:text-3xl leading-tight text-on-surface mb-4">
            {tender.title_tr}
          </h1>

          {/* Institution + reference */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-outline-variant">
            {tender.institution_tr && (
              <span className="font-body text-base text-on-surface/80">
                {tender.institution_tr}
              </span>
            )}
            {tender.reference_number && (
              <span className="font-mono text-sm text-on-surface/40 bg-surface-container px-2 py-0.5 rounded">
                {tender.reference_number}
              </span>
            )}
            {tender.country_tr && (
              <span className="font-body text-sm text-on-surface/60">
                {tender.country_tr}
              </span>
            )}
          </div>

          {/* Description */}
          {safeDescription && (
            <div
              className="article-content font-body text-base text-on-surface leading-relaxed mb-8"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          )}

          {/* Document links */}
          {tender.document_urls && tender.document_urls.length > 0 && (
            <section className="mb-8">
              <h2 className="font-headline text-xl text-on-surface mb-3">Belgeler</h2>
              <ul className="flex flex-col gap-2">
                {tender.document_urls.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm text-primary hover:underline break-all"
                    >
                      Belge {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Similar tenders */}
          {similarTenders.length > 0 && (
            <section>
              <h2 className="font-headline text-xl text-on-surface mb-4">Benzer Ihaleler</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similarTenders.map((t) => (
                  <TenderCard key={t.id} tender={t} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: sticky sidebar */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-6 bg-surface-container rounded-xl p-5 border border-outline-variant">
          {/* Countdown large */}
          <div className="text-center py-2">
            <p className="font-body text-xs text-on-surface/50 uppercase tracking-wide mb-1">
              Kalan Sure
            </p>
            <CountdownDisplay deadline={tender.deadline_at} large />
          </div>

          {/* Progress bar */}
          {tender.deadline_at && status !== "expired" && (
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-outline-variant rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${progressBarColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between font-body text-xs text-on-surface/40">
                <span>0%</span>
                <span>{progress}% tamamlandı</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex flex-col gap-3">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50">
              Takvim
            </h3>
            <TimelineRow label="Yayın Tarihi" value={tender.published_at} />
            <TimelineRow label="Son Basvuru" value={tender.deadline_at} />
            <TimelineRow label="Proje Baslangıç" value={tender.project_start_at} />
            <TimelineRow label="Proje Bitis" value={tender.project_end_at} />
          </div>

          {/* Budget */}
          {tender.budget_usd != null && (
            <div>
              <p className="font-body text-xs text-on-surface/50 uppercase tracking-wide mb-0.5">
                Tahmini Butce
              </p>
              <p className="font-body text-lg font-bold text-on-surface">
                {formatBudget(tender.budget_usd)}
              </p>
            </div>
          )}

          {/* Contact email */}
          {tender.contact_email && (
            <div>
              <p className="font-body text-xs text-on-surface/50 uppercase tracking-wide mb-0.5">
                Iletisim
              </p>
              <a
                href={`mailto:${tender.contact_email}`}
                className="font-body text-sm text-primary hover:underline break-all"
              >
                {tender.contact_email}
              </a>
            </div>
          )}

          {/* Apply button */}
          <a
            href={tender.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center font-body text-sm font-semibold text-white bg-primary hover:bg-tertiary transition-colors py-3 px-4 rounded-xl"
          >
            Basvur
          </a>
        </aside>
      </div>
    </main>
  );
}
