import { isJoBlockingAsset } from "./status";

export interface AssignmentSlot {
  id?: string;
  transporter_id: string | null;
  fleet_id: string | null;
  driver_id: string | null;
  driver_phone?: string;
  purchase_price: number;
  base_price: number;
  driver_share_percentage: number;
  advance_amount: number;
  cost_account_id?: string;
  status?: string;
  jo_number?: string;
  wa_token?: string;
  tracking_token?: string;
  driver_link_token?: string;
  save_to_master?: boolean;
  container_number?: string;
  notes?: string;
  sbu_metadata?: any;
  assignment_documents?: any[];
  rejected?: boolean;
  rejected_reason?: 'truck_unavailable' | 'vendor_cancelled' | 'driver_unavailable' | 'cost_too_high' | 'other';
  rejected_note?: string;
}

export interface WoItemContext {
  unit_count: number;
  deal_price: number;
  handover_approved?: boolean;
  max_jo_count?: number;
  stops?: unknown[];
  origin_city?: string;
  origin_name?: string;
  origin_location_name?: string;
  destination_city?: string;
  destination_name?: string;
  destination_location_name?: string;
  vehicle_type_name?: string;
  vehicle_type?: string;
  est_distance_km?: number | null;
  est_duration?: string | null;
}

export interface TransporterOption {
  id: string;
  name: string;
  is_vendor: boolean;
  is_own: boolean;
}

export interface DriverAllowanceRow {
  origin_city?: string | null;
  destination_city?: string | null;
  fleet_type_id?: string | null;
  amount?: number | null;
}

export function parseItemData(raw: unknown): WoItemContext {
  if (!raw) return { unit_count: 1, deal_price: 0 };
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as WoItemContext;
    } catch {
      return { unit_count: 1, deal_price: 0 };
    }
  }
  return raw as WoItemContext;
}

export function computeMaxJoCount(item: WoItemContext): number {
  const unitCount = Number(item.unit_count) || 1;
  if (item.handover_approved === true) {
    return Number(item.max_jo_count) || 0;
  }
  return unitCount;
}

export function generateTrackingToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function generateDriverLinkToken(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function buildJoNumber(woNumber: string, slotIndex: number): string {
  return `${woNumber}-${String(slotIndex + 1).padStart(2, "0")}`;
}

export function isFilledAssignment(slot: AssignmentSlot): boolean {
  return Boolean(slot.fleet_id || slot.driver_id || slot.transporter_id);
}

export function isEmptySlot(slot: AssignmentSlot): boolean {
  return !slot.id && !slot.transporter_id && !slot.fleet_id && !slot.driver_id && !slot.rejected;
}

export function isRejectedSlot(slot: AssignmentSlot): boolean {
  return slot.rejected === true && Boolean(slot.rejected_reason);
}

export function validateVendorPurchasePrice(
  slot: AssignmentSlot,
  isVendor: boolean,
  unitLabel: string,
): string | null {
  if (isVendor && (!slot.purchase_price || slot.purchase_price <= 0)) {
    return `Harga beli untuk unit ${unitLabel} harus diisi untuk vendor`;
  }
  return null;
}

export function resolveIsVendor(
  transporter: TransporterOption | undefined,
  driverEntityIsVendor: boolean | undefined,
): boolean {
  if (transporter?.is_own === true) return false;
  return transporter?.is_vendor === true || driverEntityIsVendor === true;
}

export function computeMargin(
  basePrice: number,
  purchasePrice: number,
): {
  margin: number;
  percent: number;
} {
  const margin = basePrice - purchasePrice;
  const percent = basePrice > 0 ? (margin / basePrice) * 100 : 0;
  return { margin, percent };
}

export function matchDriverAllowance(
  allowances: DriverAllowanceRow[],
  origin: string,
  destination: string,
  fleetTypeId: string,
): DriverAllowanceRow | null {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  return (
    allowances.find((a) => {
      const ac = (a.origin_city || "").toUpperCase();
      const dc = (a.destination_city || "").toUpperCase();
      const originMatch = ac === o || o.includes(ac) || ac.includes(o);
      const destMatch = dc === d || d.includes(dc) || dc.includes(d);
      return originMatch && destMatch && a.fleet_type_id === fleetTypeId;
    }) || null
  );
}

export function getRouteOriginDest(item: WoItemContext): {
  origin: string;
  dest: string;
} {
  const origin = (
    item.origin_city ||
    item.origin_name ||
    item.origin_location_name ||
    ""
  ).toUpperCase();
  const dest = (
    item.destination_city ||
    item.destination_name ||
    item.destination_location_name ||
    ""
  ).toUpperCase();
  return { origin, dest };
}

/** Existing JOs on this WO item that still occupy fleet/driver */
export function getActiveAssetIdsFromJos(
  jos: {
    status?: string | null;
    fleet_id?: string | null;
    driver_id?: string | null;
  }[],
): { activeFleetIds: string[]; activeDriverIds: string[] } {
  const active = jos.filter((j) => isJoBlockingAsset(j.status));
  return {
    activeFleetIds: active.map((j) => j.fleet_id).filter(Boolean) as string[],
    activeDriverIds: active.map((j) => j.driver_id).filter(Boolean) as string[],
  };
}

export function mapTransportersForTenant(
  entities: {
    id: string;
    name: string;
    is_vendor?: boolean | null;
    is_customer?: boolean | null;
    is_own?: boolean | null;
    vendor_type?: string | null;
  }[],
  tenantName: string,
  tenantCode: string,
): TransporterOption[] {
  const tenantNameUp = tenantName.toUpperCase();
  const tenantCodeUp = tenantCode.toUpperCase();

  return entities
    .filter((t) => t.is_vendor || !t.is_customer)
    .map((t) => {
      const explicitOwn = typeof t.is_own === "boolean" ? t.is_own : undefined;
      const explicitVendorType = (t.vendor_type || "").toUpperCase();
      const explicitVendorTypeOwn =
        explicitVendorType === "OWN" || explicitVendorType === "INTERNAL";
      const explicitVendorTypeVendor = explicitVendorType === "VENDOR";
      const inferredOwnByFallback =
        !t.is_vendor ||
        t.name.toUpperCase().includes(tenantNameUp) ||
        t.name.toUpperCase().includes(tenantCodeUp) ||
        t.name.toUpperCase().includes("INTERNAL") ||
        t.name.toUpperCase().includes("(OWN)");

      const isActuallyOwn =
        explicitOwn ??
        (explicitVendorTypeOwn
          ? true
          : explicitVendorTypeVendor
            ? false
            : inferredOwnByFallback);

      return {
        id: t.id,
        name:
          isActuallyOwn && !t.name.includes("(OWN)")
            ? `(OWN) ${t.name}`
            : t.name,
        is_vendor: !isActuallyOwn,
        is_own: isActuallyOwn,
      };
    })
    .sort((a, b) => {
      if (a.is_own === b.is_own) return 0;
      return a.is_own ? -1 : 1;
    });
}

export function buildInitialAssignmentSlots(
  existingJos: AssignmentSlot[],
  item: WoItemContext,
  dealPrice: number,
  internalTransporterId: string,
): AssignmentSlot[] {
  const maxJOCount = computeMaxJoCount(item);
  const isHandoverApproved = item.handover_approved === true;

  const existingAssignments: AssignmentSlot[] = existingJos.map((existing: any) => ({
    id: existing.id,
    transporter_id: existing.transporter_id ?? null,
    fleet_id: existing.fleet_id ?? null,
    driver_id: existing.driver_id ?? null,
    driver_phone: existing.driver_phone || "",
    purchase_price: Number(existing.purchase_price) || 0,
    base_price: Number(existing.base_price) || dealPrice,
    driver_share_percentage: Number(existing.driver_share_percentage ?? 0),
    advance_amount: Number(existing.advance_amount) || 0,
    jo_number: existing.jo_number,
    tracking_token: existing.tracking_token,
    wa_token: existing.wa_token,
    status: existing.status || "assigned",
    container_number: existing.container_number || (existing.sbu_metadata ? existing.sbu_metadata.container_number : "") || "",
    notes: existing.notes || "",
    assignment_documents: existing.assignment_documents || [],
  }));

  const emptySlotsNeeded = isHandoverApproved
    ? 0
    : Math.max(0, maxJOCount - existingAssignments.length);

  const emptySlots: AssignmentSlot[] = Array.from({
    length: emptySlotsNeeded,
  }).map(() => ({
    transporter_id: internalTransporterId || null,
    fleet_id: null,
    driver_id: null,
    driver_phone: "",
    purchase_price: 0,
    base_price: dealPrice,
    driver_share_percentage: 0,
    advance_amount: 0,
    status: "draft",
    container_number: "",
    assignment_documents: [],
    notes: "",
  }));

  return [...existingAssignments, ...emptySlots];
}
