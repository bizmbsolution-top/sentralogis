/**
 * Shared column definitions for reporting matrices (HQ rollup + per-SBU).
 */

export type ColDef = { id: string; label: string; numeric?: boolean };

export const COL_OPERATION: Record<string, ColDef[]> = {
  all: [
    { id: "wo_number",    label: "WO Number" },
    { id: "jo_number",    label: "JO Number" },
    { id: "sbu_type",     label: "SBU" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status",    label: "Status" },
    { id: "detail",       label: "Detail" },
    { id: "ar_total",     label: "Revenue",      numeric: true },
    { id: "gross_margin", label: "Gross Margin",  numeric: true },
  ],
  TRUCKING: [
    { id: "wo_number",    label: "WO Number" },
    { id: "jo_number",    label: "JO Number" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status",    label: "Status" },
    { id: "route",        label: "Route" },
    { id: "truck_type",   label: "Truck Type" },
    { id: "fleet_info",   label: "Fleet/Plate" },
    { id: "vendor_name",  label: "Vendor" },
    { id: "ar_total",     label: "Revenue (AR)", numeric: true },
    { id: "cash_advance", label: "Uang Jalan",   numeric: true },
    { id: "ap_total",     label: "Vendor Cost",   numeric: true },
    { id: "total_cost",   label: "Total Cost",    numeric: true },
    { id: "gross_margin", label: "Gross Margin",  numeric: true },
  ],
  WAREHOUSE: [
    { id: "wo_number",    label: "WO Number" },
    { id: "jo_number",    label: "JO Number" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status",    label: "Status" },
    { id: "warehouse_name", label: "Gudang" },
    { id: "op_type",      label: "Tipe Operasi" },
    { id: "products",     label: "Products" },
    { id: "ar_total",     label: "Revenue (AR)", numeric: true },
    { id: "gross_margin", label: "Gross Margin", numeric: true },
  ],
  CLEARANCE: [
    { id: "wo_number",    label: "WO Number" },
    { id: "jo_number",    label: "JO Number" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status",    label: "Status" },
    { id: "clearance_mode", label: "Mode" },
    { id: "service_type", label: "Service Type" },
    { id: "doc_ref",      label: "Doc Reference" },
    { id: "ar_total",     label: "Revenue (AR)", numeric: true },
    { id: "gross_margin", label: "Gross Margin", numeric: true },
  ],
  FORWARDING: [
    { id: "wo_number",    label: "WO Number" },
    { id: "jo_number",    label: "JO Number" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status",    label: "Status" },
    { id: "route",        label: "Route" },
    { id: "shipping_line", label: "Shipping Line" },
    { id: "ar_total",     label: "Revenue (AR)", numeric: true },
    { id: "gross_margin", label: "Gross Margin", numeric: true },
  ],
};

export const COL_FINANCIAL: ColDef[] = [
  { id: "wo_number",      label: "WO Number" },
  { id: "sbu_type",       label: "SBU" },
  { id: "company_name",   label: "Pelanggan (AR)" },
  { id: "ar_total",       label: "Invoice Amount",  numeric: true },
  { id: "ar_outstanding", label: "AR Outstanding",   numeric: true },
  { id: "vendor_name",    label: "Vendor (AP)" },
  { id: "ap_total",       label: "Vendor Price",     numeric: true },
  { id: "cash_advance",   label: "Cash Advance",     numeric: true },
  { id: "ap_outstanding", label: "AP Balance",        numeric: true },
  { id: "gross_margin",   label: "Gross Margin",     numeric: true },
];

export const NUMERIC_COLS = [
  "ar_total",
  "ar_outstanding",
  "ap_total",
  "ap_outstanding",
  "cash_advance",
  "total_cost",
  "gross_margin",
];

export const SBU_PILL_COLORS: Record<string, string> = {
  TRUCKING:   "bg-blue-100 text-blue-700 border-blue-200",
  WAREHOUSE:  "bg-amber-100 text-amber-700 border-amber-200",
  CLEARANCE:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  FORWARDING: "bg-indigo-100 text-indigo-700 border-indigo-200",
};
