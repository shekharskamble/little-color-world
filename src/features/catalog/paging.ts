/** Catalog grid: 3 columns × 3 rows per page. */
export const CATALOG_COLUMNS = 3;
export const CATALOG_ROWS = 3;
export const CARDS_PER_PAGE = CATALOG_COLUMNS * CATALOG_ROWS;

/** Splits items into consecutive pages of `size` (the last page may be shorter). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new RangeError('size must be at least 1');
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** Keeps a page index inside [0, pageCount - 1]. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 0), Math.max(pageCount - 1, 0));
}
