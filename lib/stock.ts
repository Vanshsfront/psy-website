export type StockLike = {
  stock_status: boolean | null;
  stock_quantity: number | null;
};

export const LOW_STOCK_THRESHOLD = 2;

// Public inventory display label. Hides exact counts so customers don't
// see "1 piece left" framed against deeper stock numbers elsewhere.
export type StockLabel =
  | { kind: "in_stock" }
  | { kind: "low_stock"; qty: number }
  | { kind: "sold_out" };

export function stockLabel(p: StockLike): StockLabel {
  if (isSoldOut(p)) return { kind: "sold_out" };
  const qty = availableQty(p);
  if (qty <= LOW_STOCK_THRESHOLD) return { kind: "low_stock", qty };
  return { kind: "in_stock" };
}

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
