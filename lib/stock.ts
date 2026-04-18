export type StockLike = {
  stock_status: boolean | null;
  stock_quantity: number | null;
};

export const LOW_STOCK_THRESHOLD = 10;

export function availableQty(p: StockLike): number {
  if (!p.stock_status) return 0;
  const q = p.stock_quantity ?? 0;
  return q > 0 ? q : 0;
}

export function isSoldOut(p: StockLike): boolean {
  return availableQty(p) <= 0;
}

export function variantAvailableQty(
  row: { stock_quantity: number | null } | null | undefined
): number {
  if (!row) return 0;
  const q = row.stock_quantity ?? 0;
  return q > 0 ? q : 0;
}
