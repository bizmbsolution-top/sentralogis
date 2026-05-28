export type InvoiceChargeType = 'ritase' | 'surcharge' | 'reimbursement';
export type InvoiceLineType = 'ritase' | 'extra_cost' | 'manual';

export interface InvoiceLineRow {
  /** Client key; `new-*` until persisted */
  id: string;
  dbId?: string;
  line_type: InvoiceLineType;
  job_order_id?: string | null;
  extra_cost_id?: string | null;
  description: string;
  coa_id: string | null;
  charge_type: InvoiceChargeType;
  quantity: number;
  unit_amount: number;
  amount: number;
  sort_order: number;
  jo_number?: string;
  fleet_plate?: string;
  driver_name?: string;
  route?: string;
}

export function lineAmount(qty: number, unit: number): number {
  return Math.round(qty * unit);
}

export function calculateInvoiceTotals(
  lines: InvoiceLineRow[],
  taxRatePercent: number
): {
  dpp: number;
  reimbursement: number;
  surcharge: number;
  taxAmount: number;
  grandTotal: number;
} {
  let dpp = 0;
  let reimbursement = 0;
  let surcharge = 0;

  for (const line of lines) {
    const amt = Number(line.amount) || 0;
    if (line.charge_type === 'reimbursement') {
      reimbursement += amt;
    } else if (line.charge_type === 'surcharge') {
      surcharge += amt;
      dpp += amt;
    } else {
      dpp += amt;
    }
  }

  const taxAmount = Math.round((dpp * (taxRatePercent || 0)) / 100);
  const grandTotal = dpp + taxAmount + reimbursement;

  return { dpp, reimbursement, surcharge, taxAmount, grandTotal };
}

export function defaultCoaForChargeType(
  chargeType: InvoiceChargeType,
  coaList: { id: string; account_number: string; category: string }[]
): string | null {
  if (chargeType === 'reimbursement') {
    const reimb = coaList.find((c) => c.account_number === '1-10120');
    if (reimb) return reimb.id;
  }
  const revenue = coaList.find((c) => c.account_number === '4-40010' || c.category === 'Revenue');
  return revenue?.id || null;
}
