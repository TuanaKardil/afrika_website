const SITE_URL = "https://www.afrikahaberleri.tr";

export interface Crumb {
  /** Visible label. */
  name: string;
  /** Site-relative path (e.g. "/firsatlar") or absolute URL. */
  href: string;
}

/**
 * Renders a breadcrumb trail (UI `<nav>` + BreadcrumbList JSON-LD).
 *
 * Pass every level including the current page as the LAST item — it is shown as
 * plain text (not a link) but still included in the structured data with its
 * own URL, which Google expects. Home ("Ana Sayfa") is added automatically.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Ana Sayfa", href: "/" }, ...items];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.href.startsWith("http") ? c.href : `${SITE_URL}${c.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav
        aria-label="Sayfa yolu"
        className="mb-6 flex items-center gap-2 font-body text-sm text-on-surface/50"
      >
        {all.map((c, i) => {
          const isLast = i === all.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {isLast ? (
                <span className="text-on-surface/30 truncate max-w-[240px]">{c.name}</span>
              ) : (
                <a href={c.href} className="hover:text-primary transition-colors">
                  {c.name}
                </a>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
