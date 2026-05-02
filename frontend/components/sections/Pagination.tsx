import Link from "next/link";
import { PAGE_SIZE } from "@/lib/queries/articles";

interface PaginationProps {
  page: number;
  total: number;
  basePath: string;
  pageSize?: number;
}

function buildUrl(basePath: string, page: number): string {
  const separator = basePath.includes("?") ? "&" : "?";
  return page === 1 ? basePath : `${basePath}${separator}sayfa=${page}`;
}

export default function Pagination({
  page,
  total,
  basePath,
  pageSize = PAGE_SIZE,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Show at most 5 page numbers centered around current page
  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav
      aria-label="Sayfalama"
      className="flex items-center justify-center gap-1 mt-10"
    >
      {hasPrev ? (
        <Link
          href={buildUrl(basePath, page - 1)}
          className="px-3 py-2 font-body text-sm text-on-surface/70 hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
        >
          Önceki
        </Link>
      ) : (
        <span className="px-3 py-2 font-body text-sm text-on-surface/30 cursor-not-allowed">
          Önceki
        </span>
      )}

      {start > 1 && (
        <>
          <Link
            href={buildUrl(basePath, 1)}
            className="w-9 h-9 flex items-center justify-center font-body text-sm rounded-lg hover:bg-surface-container text-on-surface/70 hover:text-primary transition-colors"
          >
            1
          </Link>
          {start > 2 && (
            <span className="px-1 font-body text-sm text-on-surface/40">...</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildUrl(basePath, p)}
          aria-current={p === page ? "page" : undefined}
          className={`w-9 h-9 flex items-center justify-center font-body text-sm rounded-lg transition-colors ${
            p === page
              ? "bg-primary text-white font-semibold"
              : "hover:bg-surface-container text-on-surface/70 hover:text-primary"
          }`}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 font-body text-sm text-on-surface/40">...</span>
          )}
          <Link
            href={buildUrl(basePath, totalPages)}
            className="w-9 h-9 flex items-center justify-center font-body text-sm rounded-lg hover:bg-surface-container text-on-surface/70 hover:text-primary transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {hasNext ? (
        <Link
          href={buildUrl(basePath, page + 1)}
          className="px-3 py-2 font-body text-sm text-on-surface/70 hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
        >
          Sonraki
        </Link>
      ) : (
        <span className="px-3 py-2 font-body text-sm text-on-surface/30 cursor-not-allowed">
          Sonraki
        </span>
      )}
    </nav>
  );
}
