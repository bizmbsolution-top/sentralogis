/**
 * Shared transform: flatten work_orders → reporting rows (HQ rollup + per-SBU).
 *
 * Business rules encoded here once:
 *  - Revenue per JO = unit deal price (harga satuan), total = JOs × unit price.
 *  - Cost per JO = unit cost (advance for internal trucking, vendor price otherwise).
 *  - Status taxonomy + Indonesian labels shared across HQ and SBU.
 */
import { getMappedStatuses, formatJoStatus } from "./status";
import { computeJoFinancials, computeRejectedFinancials } from "./financials";

export interface FlattenOptions {
  /** Restrict to a single SBU (uppercase) or "all". */
  sbuFilter?: string;
  /** Raw status filter keys (e.g. ["done"], ["rejected"]). */
  statusFilter?: string[];
  customerFilter?: string;
  customerChildren?: { id: string; parent_id: string }[];
  truckTypeFilter?: string;
  transporterFilter?: string; // "all" | "internal" | "vendor"
  vendorFilter?: string; // specific vendor entity id
  warehouseFilter?: string;
  opTypeFilter?: string;
  clearanceModeFilter?: string;
  /** Use Indonesian labels (MENUNGGU BERANGKAT / ... ) for jo_status. */
  indonesianStatus?: boolean;
}

export interface ReportRow {
  id: string;
  wo_number: string;
  jo_number: string;
  company_name: string;
  jo_status: string;
  sbu_type: string;
  route: string;
  detail: string;
  fleet_info: string;
  vendor_name: string;
  truck_type: string;
  ar_total: number;
  ar_outstanding: number;
  ap_total: number;
  ap_outstanding: number;
  cash_advance: number;
  total_cost: number;
  gross_margin: number;
  warehouse_name: string;
  op_type: string;
  products: string;
  clearance_mode: string;
  service_type: string;
  doc_ref: string;
  shipping_line: string;
}

export function buildRoute(item: any): string {
  const originName = item?.item_data?.shipper_name || item?.item_data?.origin_name || "TBA";
  const destinationName = item?.item_data?.recipient_name || item?.item_data?.destination_name || "TBA";
  return `${originName} → ${destinationName}`;
}

/** Internal fleet = no company, or company name contains sentralogis. */
export function isInternalJo(jo: any): boolean {
  return !jo?.fleets?.companies || jo?.fleets?.companies?.name?.toLowerCase().includes("sentralogis");
}

function buildDetail(item: any, sbu: string, route: string, opType: string, warehouseName: string, clearanceMode: string, serviceType: string): string {
  if (sbu === "TRUCKING") return route;
  if (sbu === "WAREHOUSE") return `${opType} @ ${warehouseName}`;
  if (sbu === "CLEARANCE") return `${clearanceMode} / ${serviceType}`;
  return route;
}

/**
 * Flatten fetched work_orders (with customers, wo_items, job_orders, fleets)
 * into reporting rows using identical logic for HQ & SBU.
 */
export function flattenWorkOrderReport(
  woData: any[],
  opts: FlattenOptions = {},
): ReportRow[] {
  const {
    sbuFilter = "all",
    statusFilter = [],
    customerFilter = "",
    customerChildren = [],
    truckTypeFilter = "",
    transporterFilter = "all",
    vendorFilter = "all",
    warehouseFilter = "",
    opTypeFilter = "all",
    clearanceModeFilter = "all",
    indonesianStatus = false,
  } = opts;

  const activeStatusFilters = getMappedStatuses(statusFilter);
  const flattened: ReportRow[] = [];

  woData?.forEach((wo: any) => {
    wo.wo_items?.forEach((item: any) => {
      const itemSbu = item.sbu_type?.toUpperCase() || "TRUCKING";
      if (sbuFilter !== "all" && itemSbu !== sbuFilter) return;

      // Customer filter — parent covers its children (bill-to is always parent)
      if (customerFilter) {
        const childIds = customerChildren
          .filter((c: any) => c.parent_id === customerFilter)
          .map((c: any) => c.id);
        if (wo.customer_id !== customerFilter && !childIds.includes(wo.customer_id)) return;
      }

      const routeStr = buildRoute(item);
      const itemTruckType = item.item_data?.vehicle_type_name || "-";
      const warehouseName = item.item_data?.warehouse_name || "-";
      const opType = item.item_data?.operation_type || item.item_data?.direction || "-";
      const clearanceMode = item.service_type || item.item_data?.clearance_mode || "-";
      const serviceType = item.item_data?.service_type || "-";
      const docRef = item.item_data?.doc_reference || item.item_data?.aju_number || "-";
      const shippingLine = item.item_data?.shipping_line || item.item_data?.carrier_name || "-";

      const manifests = item.wo_item_manifests || [];
      const productsStr = manifests.length > 0
        ? manifests.map((m: any) => `${m.quantity}x ${m.md_product_skus?.name || m.md_product_skus?.sku_code || "?"}`).join(", ")
        : "-";

      // SBU-specific filter checks
      if (itemSbu === "TRUCKING" && truckTypeFilter && itemTruckType !== truckTypeFilter) return;
      if (itemSbu === "CLEARANCE" && clearanceModeFilter !== "all") {
        const itmType = (item.service_type || item.item_data?.clearance_mode || "").toLowerCase();
        if (!itmType.includes(clearanceModeFilter)) return;
      }
      if (itemSbu === "WAREHOUSE") {
        if (warehouseFilter && item.item_data?.warehouse_id !== warehouseFilter) return;
        if (opTypeFilter !== "all") {
          const opTypeLower = (item.item_data?.operation_type || item.item_data?.direction || "").toLowerCase();
          if (!opTypeLower.includes(opTypeFilter)) return;
        }
      }

      const detail = buildDetail(item, itemSbu, routeStr, opType, warehouseName, clearanceMode, serviceType);
      const rawItemStatus = item.status?.toLowerCase();
      const rawWoStatus = wo.status?.toLowerCase();
      const isRejected = rawItemStatus === "rejected" || rawWoStatus === "rejected";

      const jos = item.job_orders || [];

      // No JOs → rejected WO row
      if (jos.length === 0) {
        if (activeStatusFilters.length > 0 && !activeStatusFilters.includes("rejected") && !isRejected) return;
        if (isRejected || activeStatusFilters.length === 0) {
          const fin = computeRejectedFinancials(item);
          flattened.push({
            id: `item-${item.id}`,
            wo_number: wo.wo_number,
            jo_number: "REJECTED_WO",
            company_name: wo.customers?.legal_name || wo.customers?.name || "-",
            jo_status: indonesianStatus ? "DIBATALKAN" : "REJECTED",
            sbu_type: itemSbu,
            route: routeStr,
            detail,
            fleet_info: "N/A",
            vendor_name: "N/A",
            truck_type: itemTruckType,
            ...fin,
            warehouse_name: warehouseName,
            op_type: opType,
            products: productsStr,
            clearance_mode: clearanceMode,
            service_type: serviceType,
            doc_ref: docRef,
            shipping_line: shippingLine,
          });
        }
        return;
      }

      // One row per JO — each JO carries the full unit deal price (business rule).
      jos.forEach((jo: any) => {
        const joStatus = jo.status?.toLowerCase();
        if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(joStatus)) return;

        const isInternal = isInternalJo(jo);
        if (itemSbu === "TRUCKING" && transporterFilter !== "all") {
          if (transporterFilter === "internal" && !isInternal) return;
          if (transporterFilter === "vendor" && isInternal) return;
          if (vendorFilter !== "all" && jo.fleets?.companies?.id !== vendorFilter) return;
        }

        const fin = computeJoFinancials({
          item,
          jo,
          sbuType: itemSbu,
          isInternal,
          billingPaid: wo.billing_status === "paid",
        });

        flattened.push({
          id: jo.id,
          wo_number: wo.wo_number,
          jo_number: jo.jo_number,
          company_name: wo.customers?.legal_name || wo.customers?.name || "-",
          jo_status: indonesianStatus ? formatJoStatus(jo.status) : (jo.status || "").toUpperCase(),
          sbu_type: itemSbu,
          route: routeStr,
          detail,
          fleet_info: jo.fleets?.plate_number || "Internal",
          vendor_name: jo.fleets?.companies?.name || "N/A",
          truck_type: itemTruckType,
          ...fin,
          warehouse_name: warehouseName,
          op_type: opType,
          products: productsStr,
          clearance_mode: clearanceMode,
          service_type: serviceType,
          doc_ref: docRef,
          shipping_line: shippingLine,
        });
      });
    });
  });

  return flattened;
}
