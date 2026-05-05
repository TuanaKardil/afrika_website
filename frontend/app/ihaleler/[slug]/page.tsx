import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getTenderBySlug,
  getTenderCategories,
  getSimilarTenders,
  getTenderStatus,
  type Tender,
} from "@/lib/queries/tenders";
import { sanitizeArticleContent } from "@/lib/sanitize";
import { formatDate, formatDateShort } from "@/lib/utils";
import CountdownDisplay from "@/components/ui/CountdownDisplay";
import TenderCard from "@/components/ui/TenderCard";
import TenderFavoriteButton from "@/components/ui/TenderFavoriteButton";
import TenderShareButtons from "@/components/ui/TenderShareButtons";

export const dynamic = "force-dynamic";

interface TenderPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: TenderPageProps): Promise<Metadata> {
  const tender = await getTenderBySlug(decodeURIComponent(params.slug));
  if (!tender || tender.is_suppressed) return {};
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

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes(".pdf");
}

interface TimelineRowProps {
  label: string;
  value: string | null;
}

function TimelineRow({ label, value }: TimelineRowProps) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      <div>
        <p className="font-body text-xs text-on-surface/50 uppercase tracking-wide">{label}</p>
        <p className="font-body text-sm text-on-surface font-medium">{formatDate(value)}</p>
      </div>
    </div>
  );
}

function StepIcon({ n }: { n: number }) {
  return (
    <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-white font-body text-sm font-bold flex items-center justify-center">
      {n}
    </span>
  );
}

const STATUS_META = {
  active: { label: "Aktif", classes: "bg-green-100 text-green-700" },
  planned: { label: "Planlandı", classes: "bg-amber-100 text-amber-700" },
  expired: { label: "Süresi Doldu", classes: "bg-red-100 text-red-600" },
};

export default async function TenderDetailPage({ params }: TenderPageProps) {
  const slug = decodeURIComponent(params.slug);
  const tender = await getTenderBySlug(slug);
  if (!tender || tender.is_suppressed) notFound();

  const [categories, similarTenders] = await Promise.all([
    getTenderCategories(),
    getSimilarTenders(tender, 4),
  ]);

  const categoryMap: Record<string, string> = {};
  categories.forEach((c) => { categoryMap[c.slug] = c.name_tr; });

  const status = getTenderStatus(tender);
  const statusMeta = STATUS_META[status];
  const displayTitle = tender.title_tr ?? tender.title_original ?? "";
  const categoryName = tender.category_slug ? (categoryMap[tender.category_slug] ?? tender.category_slug) : null;

  const safeDescription = sanitizeArticleContent(
    tender.description_tr ?? tender.description_original ?? ""
  );
  const hasDescription = safeDescription.trim().length > 0;

  const pdfDocs = (tender.document_urls ?? []).filter(isPdfUrl);
  const otherDocs = (tender.document_urls ?? []).filter((u) => !isPdfUrl(u));
  const hasDocs = (tender.document_urls ?? []).length > 0;

  const hoursLeft = tender.deadline_at
    ? (new Date(tender.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60)
    : null;
  const isUrgent = hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 24;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Sayfa yolu" className="mb-6 flex items-center gap-1.5 font-body text-sm text-on-surface/50 flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/ihaleler" className="hover:text-primary transition-colors">İhaleler</Link>
        {categoryName && tender.category_slug && (
          <>
            <span>/</span>
            <Link
              href={`/ihaleler/kategori/${tender.category_slug}`}
              className="hover:text-primary transition-colors"
            >
              {categoryName}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-on-surface/30 truncate max-w-[220px]" title={displayTitle}>
          {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "..." : displayTitle}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

        {/* ---- Left column: main content ---- */}
        <div className="min-w-0">
          {/* Status + category badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`font-body text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusMeta.classes}`}>
              {statusMeta.label}
            </span>
            {isUrgent && (
              <span className="inline-flex items-center gap-1 font-body text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-red-600 text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Acil
              </span>
            )}
            {categoryName && tender.category_slug && (
              <Link
                href={`/ihaleler/kategori/${tender.category_slug}`}
                className={`font-body text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full transition-colors ${
                  tender.category_slug === "diger"
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {categoryName}
              </Link>
            )}
          </div>

          {/* Title + favorite */}
          <div className="flex items-start gap-3 mb-4">
            <h1 className="font-headline text-2xl md:text-3xl leading-tight text-on-surface flex-1">
              {displayTitle}
            </h1>
            <Suspense>
              <TenderFavoriteButton tenderId={tender.id} />
            </Suspense>
          </div>

          {/* Institution + reference + country */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-outline-variant">
            {tender.institution_tr && (
              <span className="font-body text-base text-on-surface/80">{tender.institution_tr}</span>
            )}
            {tender.reference_number && (
              <span className="font-mono text-sm text-on-surface/40 bg-surface-container px-2 py-0.5 rounded">
                {tender.reference_number}
              </span>
            )}
            {tender.country_tr && (
              <span className="font-body text-sm text-on-surface/60">{tender.country_tr}</span>
            )}
          </div>

          {/* Description */}
          <section className="mb-8">
            <h2 className="font-headline text-xl text-on-surface mb-3">Açıklama</h2>
            {hasDescription ? (
              <div
                className="article-content font-body text-base text-on-surface leading-relaxed"
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <svg className="w-5 h-5 text-on-surface/40 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-body text-sm text-on-surface/70 mb-2">
                    Bu ihale için açıklama henüz mevcut değil.
                  </p>
                  {tender.source_url && (
                    <a
                      href={tender.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-primary hover:underline"
                    >
                      Tam açıklama için kaynak siteyi ziyaret edin
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Application steps */}
          {status !== "expired" && tender.source_url && (
            <section className="mb-8">
              <h2 className="font-headline text-xl text-on-surface mb-4">Başvuru Adımları</h2>
              <ol className="flex flex-col gap-4">
                <li className="flex items-center gap-3">
                  <StepIcon n={1} />
                  <div>
                    <p className="font-body text-sm font-semibold text-on-surface">Dokümanları İndir</p>
                    {hasDocs ? (
                      <p className="font-body text-xs text-on-surface/50 mt-0.5">
                        {(tender.document_urls ?? []).length} belge mevcut. Aşağıdaki belgeler bölümünden indirebilirsiniz.
                      </p>
                    ) : (
                      <p className="font-body text-xs text-on-surface/50 mt-0.5">
                        Belgeler için kaynak siteyi ziyaret edin.
                      </p>
                    )}
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <StepIcon n={2} />
                  <div>
                    <p className="font-body text-sm font-semibold text-on-surface">Teklifi Hazırla</p>
                    <p className="font-body text-xs text-on-surface/50 mt-0.5">
                      İhale şartnamesini inceleyin ve teklifinizi hazırlayın.
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <StepIcon n={3} />
                  <div>
                    <p className="font-body text-sm font-semibold text-on-surface">Başvuruyu Tamamla</p>
                    <a
                      href={tender.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-body text-xs text-primary font-semibold hover:underline mt-0.5"
                    >
                      Resmi başvuru sayfasına git
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </li>
              </ol>
            </section>
          )}

          {/* Documents */}
          {hasDocs && (
            <section className="mb-8">
              <h2 className="font-headline text-xl text-on-surface mb-3">Belgeler</h2>
              <ul className="flex flex-col gap-2">
                {pdfDocs.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant hover:border-primary hover:text-primary text-on-surface/70 font-body text-sm transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {pdfDocs.length === 1 ? "İhale Şartnamesi" : `PDF Belge ${i + 1}`}
                      <span className="ml-auto font-mono text-[10px] text-on-surface/30 uppercase">PDF</span>
                    </a>
                  </li>
                ))}
                {otherDocs.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant hover:border-primary hover:text-primary text-on-surface/70 font-body text-sm transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
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
              <h2 className="font-headline text-xl text-on-surface mb-4">Benzer İhaleler</h2>
              <p className="font-body text-xs text-on-surface/50 mb-4">
                Aynı ülke ve benzer bütçe aralığındaki ihaleler.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similarTenders.map((t) => (
                  <TenderCard
                    key={t.id}
                    tender={t}
                    categoryNameTr={t.category_slug ? categoryMap[t.category_slug] : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---- Right sidebar ---- */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-5 bg-surface-container rounded-2xl p-5 border border-outline-variant">

          {/* Countdown */}
          <div className={`text-center py-3 rounded-xl border-2 transition-colors ${
            isUrgent
              ? "border-red-400 bg-red-50"
              : status === "expired"
              ? "border-outline-variant bg-surface-container"
              : "border-primary/20 bg-primary/5"
          }`}>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-1">
              Kalan Süre
            </p>
            <div className="flex justify-center">
              <CountdownDisplay deadline={tender.deadline_at} large />
            </div>
            {tender.deadline_at && status !== "expired" && (
              <p className="font-body text-[10px] text-on-surface/40 mt-1">
                Son: {formatDateShort(tender.deadline_at)}
              </p>
            )}
          </div>

          {/* Budget */}
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-1">
              Tahmini Bütçe
            </p>
            {tender.budget_usd != null ? (
              <p className="font-headline text-3xl font-bold text-on-surface">
                {formatBudget(tender.budget_usd)}
              </p>
            ) : (
              <p className="font-body text-sm text-on-surface/40 italic">Bütçe belirtilmemiş</p>
            )}
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-3">
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50">
              Takvim
            </h3>
            <TimelineRow label="Yayın Tarihi" value={tender.published_at} />
            <TimelineRow label="Son Başvuru" value={tender.deadline_at} />
            <TimelineRow label="Proje Başlangıç" value={tender.project_start_at} />
            <TimelineRow label="Proje Bitiş" value={tender.project_end_at} />
          </div>

          {/* Contact */}
          {tender.contact_email && (
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface/50 mb-1">
                İletişim
              </p>
              <a
                href={`mailto:${tender.contact_email}`}
                className="font-body text-sm text-primary hover:underline break-all"
              >
                {tender.contact_email}
              </a>
            </div>
          )}

          {/* Share + print */}
          <div className="border-t border-outline-variant pt-4">
            <Suspense>
              <TenderShareButtons title={displayTitle} />
            </Suspense>
          </div>

          {/* Apply CTA */}
          {tender.source_url && (
            <a
              href={tender.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-center font-body text-sm font-semibold py-3 px-4 rounded-xl transition-colors ${
                status === "expired"
                  ? "bg-surface-container-high text-on-surface/40 cursor-not-allowed pointer-events-none"
                  : "text-white bg-primary hover:bg-primary/90"
              }`}
            >
              {status === "expired" ? "Süre Doldu" : "Başvur"}
            </a>
          )}
        </aside>
      </div>
    </main>
  );
}
