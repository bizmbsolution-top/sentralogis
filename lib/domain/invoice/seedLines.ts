import {
  type InvoiceChargeType,
  type InvoiceLineRow,
  defaultCoaForChargeType,
  lineAmount,
} from './lines';

export interface SeedJobOrder {
  id: string;
  jo_number?: string;
  base_price?: number;
  fleet?: { plate_number?: string; md_fleet_types?: { type_name?: string } } | null;
  driver?: { name?: string } | null;
  wo_item?: { item_data?: Record<string, unknown> };
}

export interface SeedExtraCost {
  id: string;
  jo_id: string;
  cost_type?: string;
  charge_type?: string;
  amount: number;
  description?: string | null;
}

export interface SeedCoa {
  id: string;
  account_number: string;
  account_name: string;
  category: string;
}

function buildRoute(itemData: Record<string, unknown> | undefined): string {
  if (!itemData) return '';
  const origin =
    itemData.origin_name || itemData.shipper_name || itemData.shipper_city;
  const dest =
    itemData.destination_name || itemData.recipient_name || itemData.recipient_city;
  return [origin, dest].filter(Boolean).join(' → ');
}

export function buildSeedLines(
  jobOrders: SeedJobOrder[],
  extraCosts: SeedExtraCost[],
  coaList: SeedCoa[],
  headerCoaId?: string | null
): InvoiceLineRow[] {
  const lines: InvoiceLineRow[] = [];
  let sort = 0;
  const defaultRitaseCoa =
    headerCoaId || defaultCoaForChargeType('ritase', coaList);

  for (const jo of jobOrders) {
    const itemData = (jo.wo_item?.item_data || {}) as Record<string, unknown>;
    const route = buildRoute(itemData);
    const unit = Number(jo.base_price) || 0;
    lines.push({
      id: `ritase-${jo.id}`,
      line_type: 'ritase',
      job_order_id: jo.id,
      description: `${jo.jo_number || 'JO'}${route ? ` — ${route}` : ''}`,
      coa_id: defaultRitaseCoa,
      charge_type: 'ritase',
      quantity: 1,
      unit_amount: unit,
      amount: unit,
      sort_order: sort++,
      jo_number: jo.jo_number,
      fleet_plate: jo.fleet?.plate_number,
      driver_name: jo.driver?.name,
      route,
    });
  }

  const approvedExtras = extraCosts.filter(
    (ec) => ec.amount > 0
  );

  for (const ec of approvedExtras) {
    const jo = jobOrders.find((j) => j.id === ec.jo_id);
    const chargeType: InvoiceChargeType =
      ec.charge_type === 'surcharge' ? 'surcharge' : 'reimbursement';
    const unit = Number(ec.amount) || 0;
    lines.push({
      id: `extra-${ec.id}`,
      line_type: 'extra_cost',
      job_order_id: ec.jo_id,
      extra_cost_id: ec.id,
      description:
        ec.description ||
        `${ec.cost_type || 'Biaya tambahan'}${jo?.jo_number ? ` (${jo.jo_number})` : ''}`,
      coa_id: defaultCoaForChargeType(chargeType, coaList),
      charge_type: chargeType,
      quantity: 1,
      unit_amount: unit,
      amount: unit,
      sort_order: sort++,
      jo_number: jo?.jo_number,
      fleet_plate: jo?.fleet?.plate_number,
      driver_name: jo?.driver?.name,
      route: jo ? buildRoute(jo.wo_item?.item_data as Record<string, unknown>) : '',
    });
  }

  return lines;
}

export function mapDbLineToRow(
  db: {
    id: string;
    line_type: string;
    job_order_id?: string | null;
    extra_cost_id?: string | null;
    description?: string | null;
    coa_id?: string | null;
    charge_type?: string | null;
    quantity?: number | null;
    unit_amount?: number | null;
    amount?: number | null;
    sort_order?: number | null;
  },
  joById: Map<string, SeedJobOrder>
): InvoiceLineRow {
  const jo = db.job_order_id ? joById.get(db.job_order_id) : undefined;
  const itemData = (jo?.wo_item?.item_data || {}) as Record<string, unknown>;
  const chargeType = (db.charge_type || 'ritase') as InvoiceChargeType;
  const qty = Number(db.quantity) || 1;
  const unit = Number(db.unit_amount) || 0;

  return {
    id: db.id,
    dbId: db.id,
    line_type: (db.line_type || 'manual') as InvoiceLineRow['line_type'],
    job_order_id: db.job_order_id,
    extra_cost_id: db.extra_cost_id,
    description: db.description || '',
    coa_id: db.coa_id || null,
    charge_type: chargeType,
    quantity: qty,
    unit_amount: unit,
    amount: Number(db.amount) || lineAmount(qty, unit),
    sort_order: db.sort_order ?? 0,
    jo_number: jo?.jo_number,
    fleet_plate: jo?.fleet?.plate_number,
    driver_name: jo?.driver?.name,
    route: buildRoute(itemData),
  };
}

export function newManualLine(
  coaList: SeedCoa[],
  sortOrder: number
): InvoiceLineRow {
  return {
    id: `new-${crypto.randomUUID()}`,
    line_type: 'manual',
    description: '',
    coa_id: defaultCoaForChargeType('surcharge', coaList),
    charge_type: 'surcharge',
    quantity: 1,
    unit_amount: 0,
    amount: 0,
    sort_order: sortOrder,
  };
}
