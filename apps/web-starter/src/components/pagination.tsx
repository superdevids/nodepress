import Link from 'next/link';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  queryParams?: Record<string, string>;
  className?: string;
  showSummary?: boolean;
  total?: number;
}

type PageItem = number | { type: 'ellipsis'; key: string };

/**
 * Builds a page URL by combining base path, page number, and optional extra query params.
 * The `page` param always overrides any page value passed in queryParams.
 */
function buildPageUrl(
  basePath: string,
  page: number,
  queryParams?: Record<string, string>,
): string {
  const params = new URLSearchParams(queryParams ?? {});
  params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Generates the ordered list of page items, inserting ellipsis markers
 * where gaps exist between the first page, the sliding window around the
 * current page, and the last page.
 */
function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: PageItem[] = [];

  // Always include first page
  items.push(1);

  // Sliding window — roughly 2 pages on each side of the current page
  const windowStart = Math.max(2, currentPage - 2);
  const windowEnd = Math.min(totalPages - 1, currentPage + 2);

  // Gap between page 1 and window start
  if (windowStart > 3) {
    items.push({ type: 'ellipsis', key: 'start' });
  } else if (windowStart === 3) {
    // Small enough gap — show the intermediate page instead of ellipsis
    items.push(2);
  }

  // Sliding-window pages
  for (let i = windowStart; i <= windowEnd; i++) {
    items.push(i);
  }

  // Gap between window end and last page
  if (windowEnd < totalPages - 2) {
    items.push({ type: 'ellipsis', key: 'end' });
  } else if (windowEnd === totalPages - 2) {
    items.push(totalPages - 1);
  }

  // Always include last page
  items.push(totalPages);

  return items;
}

/* ─── Shared button class fragments ─────────────────────────────── */

const btnBase =
  'inline-flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors';

const btnBorder = 'border border-wp-border';

const btnEnabled = 'text-wp-text hover:bg-wp-hover-bg bg-background';

const btnDisabled = 'text-wp-text-light bg-wp-bg-light/50 cursor-not-allowed';

const btnActive = 'bg-wp-primary text-wp-primary-text';

const btnInactive = 'text-wp-text hover:bg-wp-hover-bg';

const btnPage = 'h-10 w-10';

const btnPrevNext = 'px-4';

/* ─── Component ─────────────────────────────────────────────────── */

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  queryParams,
  className = '',
  showSummary = false,
  total,
}: PaginationProps) {
  // No pagination needed if there is only one page (or fewer)
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;
  const items = getPageItems(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className={className}>
      <div className="flex items-center justify-center gap-2">
        {/* ── Previous button ──────────────────────────────────────── */}
        {isFirstPage ? (
          <span
            aria-disabled="true"
            className={`${btnBase} ${btnBorder} ${btnDisabled} ${btnPrevNext}`}
          >
            ← Previous
          </span>
        ) : (
          <Link
            href={buildPageUrl(basePath, currentPage - 1, queryParams)}
            className={`${btnBase} ${btnBorder} ${btnEnabled} ${btnPrevNext}`}
            aria-label="Previous page"
          >
            ← Previous
          </Link>
        )}

        {/* ── Page number buttons ──────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {items.map((item) => {
            if (typeof item === 'object' && item.type === 'ellipsis') {
              return (
                <span
                  key={item.key}
                  className={`${btnBase} ${btnPage} text-wp-text-light cursor-default`}
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const pageNum = item as number;
            const isActive = pageNum === currentPage;

            return (
              <Link
                key={pageNum}
                href={buildPageUrl(basePath, pageNum, queryParams)}
                className={`${btnBase} ${btnPage} ${isActive ? btnActive : btnInactive}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${pageNum}`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* ── Next button ──────────────────────────────────────────── */}
        {isLastPage ? (
          <span
            aria-disabled="true"
            className={`${btnBase} ${btnBorder} ${btnDisabled} ${btnPrevNext}`}
          >
            Next →
          </span>
        ) : (
          <Link
            href={buildPageUrl(basePath, currentPage + 1, queryParams)}
            className={`${btnBase} ${btnBorder} ${btnEnabled} ${btnPrevNext}`}
            aria-label="Next page"
          >
            Next →
          </Link>
        )}
      </div>

      {/* ── Optional summary text ──────────────────────────────────── */}
      {showSummary && (
        <div className="text-wp-text-light mt-4 text-center text-xs">
          Page {Math.max(1, currentPage)} of {totalPages}
          {total !== undefined ? ` (${total} total)` : ''}
        </div>
      )}
    </nav>
  );
}
