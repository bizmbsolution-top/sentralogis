/**
 * Sentralogis Copilot — Deterministic Fixtures
 * lib/copilot/sandbox/deterministic-fixtures.ts
 *
 * SIMULATED DATA ONLY.
 * Explicitly labeled fixtures for multi-turn conversational testing.
 * Zero database queries, zero production dependencies.
 */

export interface SimulatedCustomer {
  id: string;
  code: string;
  name: string;
  industry: string;
  city: string;
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedSalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_FULFILLMENT' | 'COMPLETED' | 'CANCELLED';
  operationalStatus: 'BELUM_JALAN' | 'SEDANG_JALAN' | 'SELESAI';
  originCity: string;
  destinationCity: string;
  totalVolumeM3: number;
  totalWeightKg: number;
  workOrderId?: string;
  shipmentId?: string;
  jobOrderId?: string;
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedWorkOrder {
  id: string;
  woNumber: string;
  salesOrderId: string;
  customerId: string;
  customerName: string;
  status: 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED';
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedJobOrder {
  id: string;
  joNumber: string;
  workOrderId: string;
  salesOrderId: string;
  customerName: string;
  origin: string;
  destination: string;
  status:
    | 'UNASSIGNED'
    | 'ASSIGNED'
    | 'EN_ROUTE'
    | 'ARRIVED'
    | 'COMPLETED'
    | 'ACTIVE'
    | 'DOCUMENT'
    | 'DRAFT'
    | 'INVOICED';
  operationalStatus: 'BELUM_JALAN' | 'SEDANG_JALAN' | 'SELESAI';
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  period?: 'THIS_WEEK' | 'LAST_WEEK';
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedShipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  customerName: string;
  origin: string;
  destination: string;
  status: 'DRAFT' | 'READY_FOR_DISPATCH' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED';
  departureStatus: 'BELUM_BERANGKAT' | 'SUDAH_BERANGKAT';
  etd: string;
  eta: string;
  carrierName: string;
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedDriver {
  id: string;
  name: string;
  phone: string;
  status: 'AVAILABLE' | 'ON_DUTY' | 'RESTING';
  assignedVehicle: string;
  dataSource: 'SIMULATED DATA';
}

export interface SimulatedException {
  id: string;
  exceptionCode: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  relatedEntityId: string;
  relatedEntityType: 'sales-order' | 'job-order' | 'shipment';
  status: 'OPEN' | 'IN_INVESTIGATION' | 'RESOLVED';
  dataSource: 'SIMULATED DATA';
}

// ============================================================================
// SIMULATED DATA STORES
// ============================================================================

export const SIMULATED_CUSTOMERS: SimulatedCustomer[] = [
  {
    id: 'cust-abc',
    code: 'ABC',
    name: 'Customer ABC (PT Aneka Bangun Cemerlang)',
    industry: 'Konstruksi & Material',
    city: 'Jakarta',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'cust-xyz',
    code: 'XYZ',
    name: 'Customer XYZ (PT Xilem Prima Nusantara)',
    industry: 'Manufaktur & FMCG',
    city: 'Surabaya',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_DRIVERS: SimulatedDriver[] = [
  {
    id: 'drv-01',
    name: 'Budi Santoso',
    phone: '+62 812-3456-7890',
    status: 'AVAILABLE',
    assignedVehicle: 'B 9123 TXR (Truk Tronton Box)',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'drv-02',
    name: 'Agus Pratama',
    phone: '+62 813-9876-5432',
    status: 'ON_DUTY',
    assignedVehicle: 'B 9481 KLP (Wingbox 32T)',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'drv-03',
    name: 'Hendra Wijaya',
    phone: '+62 817-5544-3322',
    status: 'AVAILABLE',
    assignedVehicle: 'L 8203 UY (Truk Fuso)',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_SALES_ORDERS: SimulatedSalesOrder[] = [
  {
    id: 'so-2026-0041',
    soNumber: 'SO-2026-0041',
    customerId: 'cust-abc',
    customerName: 'Customer ABC',
    orderDate: '2026-09-28',
    status: 'CONFIRMED',
    operationalStatus: 'BELUM_JALAN',
    originCity: 'Jakarta',
    destinationCity: 'Semarang',
    totalVolumeM3: 45.5,
    totalWeightKg: 12000,
    workOrderId: 'wo-2026-0101',
    jobOrderId: 'jo-2026-0810',
    shipmentId: 'shp-2026-0301',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'so-2026-0042',
    soNumber: 'SO-2026-0042',
    customerId: 'cust-abc',
    customerName: 'Customer ABC',
    orderDate: '2026-10-02',
    status: 'CONFIRMED',
    operationalStatus: 'BELUM_JALAN',
    originCity: 'Jakarta',
    destinationCity: 'Surabaya',
    totalVolumeM3: 62.0,
    totalWeightKg: 18500,
    workOrderId: 'wo-2026-0102',
    jobOrderId: 'jo-2026-0812',
    shipmentId: 'shp-2026-0302',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'so-2026-0038',
    soNumber: 'SO-2026-0038',
    customerId: 'cust-abc',
    customerName: 'Customer ABC',
    orderDate: '2026-09-15',
    status: 'COMPLETED',
    operationalStatus: 'SELESAI',
    originCity: 'Jakarta',
    destinationCity: 'Bandung',
    totalVolumeM3: 20.0,
    totalWeightKg: 5000,
    workOrderId: 'wo-2026-0095',
    jobOrderId: 'jo-2026-0790',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'so-2026-0045',
    soNumber: 'SO-2026-0045',
    customerId: 'cust-xyz',
    customerName: 'Customer XYZ',
    orderDate: '2026-10-01',
    status: 'IN_FULFILLMENT',
    operationalStatus: 'SEDANG_JALAN',
    originCity: 'Surabaya',
    destinationCity: 'Denpasar',
    totalVolumeM3: 38.0,
    totalWeightKg: 9500,
    workOrderId: 'wo-2026-0105',
    jobOrderId: 'jo-2026-0820',
    shipmentId: 'shp-2026-0305',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_WORK_ORDERS: SimulatedWorkOrder[] = [
  {
    id: 'wo-2026-0101',
    woNumber: 'WO-2026-0101',
    salesOrderId: 'so-2026-0041',
    customerId: 'cust-abc',
    customerName: 'Customer ABC',
    status: 'ASSIGNED',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'wo-2026-0102',
    woNumber: 'WO-2026-0102',
    salesOrderId: 'so-2026-0042',
    customerId: 'cust-abc',
    customerName: 'Customer ABC',
    status: 'CONFIRMED',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_JOB_ORDERS: SimulatedJobOrder[] = [
  {
    id: 'jo-2026-0810',
    joNumber: 'JO-2026-0810',
    workOrderId: 'wo-2026-0101',
    salesOrderId: 'so-2026-0041',
    customerName: 'Customer ABC',
    origin: 'Gudang Cakung, Jakarta',
    destination: 'DC Semarang',
    status: 'ASSIGNED',
    operationalStatus: 'BELUM_JALAN',
    driverId: 'drv-02',
    driverName: 'Agus Pratama',
    vehicleNumber: 'B 9481 KLP',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0812',
    joNumber: 'JO-2026-0812',
    workOrderId: 'wo-2026-0102',
    salesOrderId: 'so-2026-0042',
    customerName: 'Customer ABC',
    origin: 'Tanjung Priok, Jakarta',
    destination: 'Tanjung Perak, Surabaya',
    status: 'UNASSIGNED',
    operationalStatus: 'BELUM_JALAN',
    driverId: undefined,
    driverName: 'Belum Ditugaskan',
    vehicleNumber: 'TBD',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_SHIPMENTS: SimulatedShipment[] = [
  {
    id: 'shp-2026-0301',
    shipmentNumber: 'SHP-2026-0301',
    salesOrderId: 'so-2026-0041',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Semarang',
    status: 'READY_FOR_DISPATCH',
    departureStatus: 'BELUM_BERANGKAT',
    etd: '2026-10-04 08:00 WIB',
    eta: '2026-10-05 14:00 WIB',
    carrierName: 'Sentralogis Land Fleet',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'shp-2026-0302',
    shipmentNumber: 'SHP-2026-0302',
    salesOrderId: 'so-2026-0042',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Surabaya',
    status: 'READY_FOR_DISPATCH',
    departureStatus: 'BELUM_BERANGKAT',
    etd: '2026-10-04 20:00 WIB',
    eta: '2026-10-06 10:00 WIB',
    carrierName: 'Sentralogis Domestik Laut (KM Lintas Nusa)',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'shp-2026-0305',
    shipmentNumber: 'SHP-2026-0305',
    salesOrderId: 'so-2026-0045',
    customerName: 'Customer XYZ',
    origin: 'Surabaya',
    destination: 'Denpasar',
    status: 'DEPARTED',
    departureStatus: 'SUDAH_BERANGKAT',
    etd: '2026-10-03 06:00 WIB',
    eta: '2026-10-04 12:00 WIB',
    carrierName: 'Sentralogis Ro-Ro Express',
    dataSource: 'SIMULATED DATA',
  },
];

export const SIMULATED_EXCEPTIONS: SimulatedException[] = [
  {
    id: 'exc-2026-001',
    exceptionCode: 'EXC-2026-001',
    severity: 'MEDIUM',
    title: 'Kendala Penugasan Driver JO-2026-0812 Surabaya',
    description: 'Job Order JO-2026-0812 (Customer ABC tujuan Surabaya) belum memiliki supir pengganti setelah alokasi armada wingbox.',
    relatedEntityId: 'jo-2026-0812',
    relatedEntityType: 'job-order',
    status: 'OPEN',
    dataSource: 'SIMULATED DATA',
  },
];

// ============================================================================
// SIMULATED WEEKLY JOB ORDERS DATASET (§3, §11, §23)
// Deterministic 50-item weekly dataset:
// Active: 24 (Customer ABC: 6, Customer XYZ: 18)
// Document: 11
// Draft: 8
// Invoiced: 7
// ============================================================================

export const SIMULATED_WEEKLY_JOB_ORDERS: SimulatedJobOrder[] = [
  // --- 24 ACTIVE (6 Customer ABC, 18 Customer XYZ) ---
  {
    id: 'jo-2026-0812',
    joNumber: 'JO-2026-0812',
    workOrderId: 'wo-2026-0102',
    salesOrderId: 'so-2026-0042',
    customerName: 'Customer ABC',
    origin: 'Tanjung Priok, Jakarta',
    destination: 'Tanjung Perak, Surabaya',
    status: 'ACTIVE',
    operationalStatus: 'BELUM_JALAN',
    driverId: undefined,
    driverName: undefined,
    vehicleNumber: 'TBD',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0810',
    joNumber: 'JO-2026-0810',
    workOrderId: 'wo-2026-0101',
    salesOrderId: 'so-2026-0041',
    customerName: 'Customer ABC',
    origin: 'Gudang Cakung, Jakarta',
    destination: 'DC Semarang',
    status: 'ACTIVE',
    operationalStatus: 'BELUM_JALAN',
    driverId: 'drv-02',
    driverName: 'Agus Pratama',
    vehicleNumber: 'B 9481 KLP',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0814',
    joNumber: 'JO-2026-0814',
    workOrderId: 'wo-2026-0103',
    salesOrderId: 'so-2026-0043',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'DC Bandung',
    status: 'ACTIVE',
    operationalStatus: 'SEDANG_JALAN',
    driverId: 'drv-03',
    driverName: 'Hendra Wijaya',
    vehicleNumber: 'L 8203 UY',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0815',
    joNumber: 'JO-2026-0815',
    workOrderId: 'wo-2026-0104',
    salesOrderId: 'so-2026-0044',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Gudang Surabaya',
    status: 'ACTIVE',
    operationalStatus: 'SEDANG_JALAN',
    driverId: 'drv-01',
    driverName: 'Budi Santoso',
    vehicleNumber: 'B 9123 TXR',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0816',
    joNumber: 'JO-2026-0816',
    workOrderId: 'wo-2026-0105',
    salesOrderId: 'so-2026-0045',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'DC Yogyakarta',
    status: 'ACTIVE',
    operationalStatus: 'SEDANG_JALAN',
    driverId: 'drv-02',
    driverName: 'Agus Pratama',
    vehicleNumber: 'B 9481 KLP',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  {
    id: 'jo-2026-0817',
    joNumber: 'JO-2026-0817',
    workOrderId: 'wo-2026-0106',
    salesOrderId: 'so-2026-0046',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'DC Solo',
    status: 'ACTIVE',
    operationalStatus: 'SEDANG_JALAN',
    driverId: 'drv-03',
    driverName: 'Hendra Wijaya',
    vehicleNumber: 'L 8203 UY',
    period: 'THIS_WEEK',
    dataSource: 'SIMULATED DATA',
  },
  // 18 Customer XYZ Active
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `jo-2026-082${i}`,
    joNumber: `JO-2026-082${i}`,
    workOrderId: `wo-2026-020${i}`,
    salesOrderId: `so-2026-020${i}`,
    customerName: 'Customer XYZ',
    origin: 'Surabaya',
    destination: i % 2 === 0 ? 'Denpasar' : 'Malang',
    status: 'ACTIVE' as const,
    operationalStatus: 'SEDANG_JALAN' as const,
    driverId: 'drv-01',
    driverName: 'Budi Santoso',
    vehicleNumber: 'B 9123 TXR',
    period: 'THIS_WEEK' as const,
    dataSource: 'SIMULATED DATA' as const,
  })),

  // --- 11 DOCUMENT ---
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `jo-2026-083${8 + i}`,
    joNumber: `JO-2026-083${8 + i}`,
    workOrderId: `wo-2026-030${i}`,
    salesOrderId: `so-2026-030${i}`,
    customerName: i % 2 === 0 ? 'Customer ABC' : 'Customer XYZ',
    origin: 'Jakarta',
    destination: 'Semarang',
    status: 'DOCUMENT' as const,
    operationalStatus: 'SELESAI' as const,
    driverId: 'drv-02',
    driverName: 'Agus Pratama',
    vehicleNumber: 'B 9481 KLP',
    period: 'THIS_WEEK' as const,
    dataSource: 'SIMULATED DATA' as const,
  })),

  // --- 8 DRAFT ---
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `jo-2026-084${9 + i}`,
    joNumber: `JO-2026-084${9 + i}`,
    workOrderId: `wo-2026-040${i}`,
    salesOrderId: `so-2026-040${i}`,
    customerName: 'Customer XYZ',
    origin: 'Jakarta',
    destination: 'Bandung',
    status: 'DRAFT' as const,
    operationalStatus: 'BELUM_JALAN' as const,
    vehicleNumber: 'TBD',
    period: 'THIS_WEEK' as const,
    dataSource: 'SIMULATED DATA' as const,
  })),

  // --- 7 INVOICED ---
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `jo-2026-085${7 + i}`,
    joNumber: `JO-2026-085${7 + i}`,
    workOrderId: `wo-2026-050${i}`,
    salesOrderId: `so-2026-050${i}`,
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Surabaya',
    status: 'INVOICED' as const,
    operationalStatus: 'SELESAI' as const,
    driverId: 'drv-03',
    driverName: 'Hendra Wijaya',
    vehicleNumber: 'L 8203 UY',
    period: 'THIS_WEEK' as const,
    dataSource: 'SIMULATED DATA' as const,
  })),

  // --- 5 LAST WEEK (Customer ABC Surabaya) ---
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `jo-2026-078${i}`,
    joNumber: `JO-2026-078${i}`,
    workOrderId: `wo-2026-008${i}`,
    salesOrderId: `so-2026-003${i}`,
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Surabaya',
    status: 'ACTIVE' as const,
    operationalStatus: 'SELESAI' as const,
    driverId: 'drv-01',
    driverName: 'Budi Santoso',
    vehicleNumber: 'B 9123 TXR',
    period: 'LAST_WEEK' as const,
    dataSource: 'SIMULATED DATA' as const,
  })),
];
