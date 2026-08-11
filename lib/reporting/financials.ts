/**
 * Shared financial computations for reporting.
 *
 * Business rule:
 *  - Revenue basis per JO = unit deal price (harga satuan), NOT wo_items.total_revenue.
 *    Total revenue per item = jumlah JO × harga satuan.
 *  - Cost basis per JO = unit cost (purchase/vendor price per unit), NOT divided.
 *
 * Both HQ rollup and per-SBU reports must use these helpers so numbers agree.
 */

export interface FinancialInput {
  item: any;
  jo: any;
  sbuType: string;
  isInternal: boolean;
  billingPaid?: boolean;
}

export interface FinancialResult {
  ar_total: number;
  ar_outstanding: number;
  ap_total: number;
  ap_outstanding: number;
  cash_advance: number;
  total_cost: number;
  gross_margin: number;
}

/**
 * Resolve the unit deal price (harga satuan) for a WO item.
 * Prefers item_data.deal_price (what the customer agreed per unit), falls back to unit_price.
 * Explicitly NOT total_revenue — that is a WO-level aggregate and not authoritative.
 */
export function resolveUnitDealPrice(item: any): number {
  const raw = item?.item_data?.deal_price ?? item?.unit_price ?? 0;
  return Number(raw || 0);
}

/**
 * Compute the per-JO financial breakdown.
 * ar_total = unit deal price (1 unit per JO).
 * total_cost = cash advance for internal trucking, vendor price for external / other SBUs.
 */
export function computeJoFinancials({
  item,
  jo,
  sbuType,
  isInternal,
  billingPaid,
}: FinancialInput): FinancialResult {
  const arTotal = resolveUnitDealPrice(item);
  const cashTotal = Number(jo?.advance_amount || 0);
  const apTotal = Number(jo?.purchase_price || jo?.vendor_price || 0);

  const isTrucking = String(sbuType).toUpperCase() === "TRUCKING";
  const totalCost = isTrucking ? (isInternal ? cashTotal : apTotal) : apTotal;
  const grossMargin = arTotal - totalCost;

  return {
    ar_total: arTotal,
    ar_outstanding: billingPaid ? 0 : arTotal,
    ap_total: apTotal,
    ap_outstanding: apTotal - cashTotal,
    cash_advance: cashTotal,
    total_cost: totalCost,
    gross_margin: grossMargin,
  };
}

/**
 * Financials for a rejected WO item that never produced a JO:
 * revenue = unit deal price, no cost.
 */
export function computeRejectedFinancials(item: any): FinancialResult {
  const arTotal = resolveUnitDealPrice(item);
  return {
    ar_total: arTotal,
    ar_outstanding: 0,
    ap_total: 0,
    ap_outstanding: 0,
    cash_advance: 0,
    total_cost: 0,
    gross_margin: arTotal,
  };
}

export const fmtCurrency = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
