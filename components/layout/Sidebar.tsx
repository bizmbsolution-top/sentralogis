'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Building, ChevronDown, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  submenu?: MenuItem[];
  requiresSbu?: string; // e.g. 'tr', 'wh', 'ink', 'fwd'
}

// ============================================
// MODULAR MENU BLOCKS (DEDUPLICATION)
// ============================================

const MOD_FINANCE_MATRIX: MenuItem = {
  label: 'Finance Matrix', icon: '💰', href: '#',
  submenu: [
    { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
    { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
    { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
  ]
};

const MOD_WAREHOUSE_HQ: MenuItem = {
  label: 'Warehouse', icon: '🏭', href: '#', requiresSbu: 'wh',
  submenu: [
    { label: 'Master Categories', icon: '🗂️', href: '/hq/master-data/categories' },
    { label: 'Master Products', icon: '📦', href: '/hq/master-data/products' },
    { label: 'Master UOM', icon: '⚖️', href: '/hq/master-data/uoms' },
    { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
    { label: 'Locations & Zones', icon: '🗺️', href: '/hq/warehouse/locations' },
    { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
    { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
    { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
    { label: 'Movements', icon: '🔄', href: '/hq/warehouse/movements' },
    { label: 'Transfers', icon: '🚛', href: '/hq/warehouse/transfers' },
    { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
    { label: 'Contract & Billing', icon: '💰', href: '/hq/warehouse/billing' },
  ]
};

const MOD_MASTER_DATA_HQ: MenuItem = {
  label: 'Master Data', icon: '🗂️', href: '#',
  submenu: [
    { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
    { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
    { label: 'Services & Charges', icon: '🏷️', href: '/hq/master/services' },
    { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types', requiresSbu: 'tr' },
    { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets', requiresSbu: 'tr' },
    { label: 'Drivers', icon: '👤', href: '/hq/master/drivers', requiresSbu: 'tr' },
  ]
};

const MOD_TRUCKING_HQ: MenuItem[] = [
  { label: 'Work Order', icon: '📋', href: '/hq/work-orders', requiresSbu: 'tr' },
  { label: 'Job Order', icon: '🚛', href: '/hq/job-orders', requiresSbu: 'tr' },
  { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities', requiresSbu: 'tr' },
  { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance', requiresSbu: 'tr' },
  { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance', requiresSbu: 'tr' },
];

const MOD_DIRECTOR_HQ: MenuItem[] = [
  { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
  { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
  MOD_FINANCE_MATRIX,
  { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities', requiresSbu: 'tr' },
  { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance', requiresSbu: 'tr' },
  { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance', requiresSbu: 'tr' },
  { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management', requiresSbu: 'tr' },
  MOD_WAREHOUSE_HQ,
  { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  { label: 'Organization', icon: '👥', href: '/tenant/staff' },
];

const MOD_COMMERCIAL: MenuItem = {
  label: 'Commercial & CRM', icon: '💼', href: '#',
  submenu: [
    { label: 'Sales Pipeline', icon: '📈', href: '/commercial/pipeline' },
    { label: 'Leads & Clients', icon: '👥', href: '/commercial/leads' },
    { label: 'Activity Logs', icon: '📝', href: '/commercial/activities' },
    { label: 'Quotations', icon: '📄', href: '/commercial/quotations' },
  ]
};


// ============================================
// MENU DEFINITIONS BY ROLE
// ============================================

const MENU_CONFIG: Record<string, MenuItem[]> = {
  // Platform Owner
  owner_sentralogis: [
    { label: 'Dashboard', icon: '🏠', href: '/owner' },
    { label: 'Tenant Management', icon: '🏢', href: '/owner/tenants' },
    {
      label: 'Transaction', icon: '📝', href: '#',
      submenu: [
        { label: 'Top-Up Requests', icon: '💰', href: '/owner/transactions' },
        { label: 'Token Ledger', icon: '📒', href: '/owner/topup' },
      ]
    },
    {
      label: 'Reports', icon: '📊', href: '/owner/reports',
      submenu: [
        { label: 'Financial', icon: '💵', href: '/owner/reports/financial' },
        { label: 'Operational', icon: '⚙️', href: '/owner/reports/operational' },
        { label: 'Token Analytics', icon: '🔥', href: '/owner/reports/token-analytics' },
      ]
    },
    { label: 'CRM', icon: '💬', href: '/owner/crm' },
    { label: 'Observability', icon: '📡', href: '/owner/observability' },
    { label: 'Settings', icon: '⚙️', href: '/owner/settings' },
    { label: 'Profile', icon: '👤', href: '/owner/profile' },
  ],

  // Superadmin Tenant
  tenant_superadmin: [
    { label: 'Dashboard', icon: '🏠', href: '/tenant' },
    { label: 'Staff Management', icon: '👥', href: '/tenant/staff' },
    { label: 'SBU Configuration', icon: '🏢', href: '/tenant/sbu' },
    {
      label: 'Master Data', icon: '🗂️', href: '#',
      submenu: [
        { label: 'Contacts', icon: '📇', href: '/tenant/master/contacts' },
        { label: 'Locations', icon: '📍', href: '/tenant/master/locations' },
      ]
    },
    {
      label: 'SBU Trucking', icon: '🚛', href: '#', requiresSbu: 'tr',
      submenu: [
        { label: 'SBU Config', icon: '⚙️', href: '/tenant/trucking' },
        { label: 'Fleet Types', icon: '🚛', href: '/tenant/master/fleet-types' },
        { label: 'Fleets', icon: '🚚', href: '/tenant/master/fleets' },
        { label: 'Drivers', icon: '👤', href: '/tenant/master/drivers' },
      ]
    },
    { label: 'Token Balance', icon: '💰', href: '/tenant/token' },
    { label: 'Business Intelligence', icon: '📊', href: '/hq/business' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        ...MOD_FINANCE_MATRIX.submenu!,
        { label: 'Master COA', icon: '📖', href: '/hq/finance/coa' },
        { label: 'Master Pajak', icon: '💵', href: '/hq/finance/tax-management' },
      ]
    },
    {
      label: 'Warehouse', icon: '🏭', href: '#', requiresSbu: 'wh',
      submenu: [
        { label: 'Master Categories', icon: '🗂️', href: '/hq/master-data/categories' },
        { label: 'Master Products', icon: '📦', href: '/hq/master-data/products' },
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/tenant/warehouse/locations' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Movements', icon: '🔄', href: '/hq/warehouse/movements' },
        { label: 'Transfers', icon: '🚛', href: '/hq/warehouse/transfers' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
        { label: 'Contract & Billing', icon: '💰', href: '/hq/warehouse/billing' },
      ]
    },
    MOD_COMMERCIAL,
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Company Profile', icon: '⚙️', href: '/tenant/profile' },
  ],

  // HQ Staff (CS - Ops - Finances) - Unifying the duplicates
  hq_cs: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    ...MOD_TRUCKING_HQ,
    MOD_FINANCE_MATRIX,
    MOD_WAREHOUSE_HQ,
    MOD_MASTER_DATA_HQ,
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_ops: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    ...MOD_TRUCKING_HQ,
    MOD_FINANCE_MATRIX,
    MOD_WAREHOUSE_HQ,
    MOD_MASTER_DATA_HQ,
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_finance: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    ...MOD_TRUCKING_HQ,
    MOD_FINANCE_MATRIX,
    MOD_WAREHOUSE_HQ,
    MOD_MASTER_DATA_HQ,
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],

  // Executive Directors - Specific Exception Dashboards
  hq_director_ops: [
    { label: 'Ops Exceptions', icon: '🚨', href: '/director/ops' },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_director_fin: [
    { label: 'Finance Exceptions', icon: '🚨', href: '/director/finance' },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_commercial_director: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    MOD_COMMERCIAL,
    { label: 'Commercial Exceptions', icon: '🚨', href: '/director/commercial' },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_sales_manager: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    MOD_COMMERCIAL,
  ],
  hq_sales_staff: [
    MOD_COMMERCIAL,
  ],
  hq_marketing_staff: [
    MOD_COMMERCIAL,
  ],
  hq_director_comm: [
    MOD_COMMERCIAL,
    { label: 'Commercial Exceptions', icon: '🚨', href: '/director/commercial' },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_director_bizdev: [
    { label: 'BizDev Exceptions', icon: '🚨', href: '/director/bizdev' },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
  ],
  hq_director_hrd: [
    { label: 'HRD Exceptions', icon: '🚨', href: '/director/hrd' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],
  hq_director_cs: MOD_DIRECTOR_HQ, // Fallback for CS director as it's not defined in new plan

  // SBU Roles (Manager, Ops, Admin, Finances)
  sbu_manager_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Quotations', icon: '📄', href: '/sbu/trucking/approvals' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/trucking/add-cost' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
    { label: 'Reporting', icon: '📊', href: '#', submenu: [
      { label: 'Financial Overview', icon: '📊', href: '/sbu/trucking/reporting' },
      { label: 'GPS Tracking', icon: '🛰️', href: '/sbu/trucking/reporting/gps-tracking' },
      { label: 'WO Financial', icon: '📋', href: '/sbu/trucking/reporting/wo-level' },
    ]},
  ],
  sbu_ops_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Quotations', icon: '📄', href: '/sbu/trucking/approvals' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/trucking/add-cost' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
    { label: 'Reporting', icon: '📊', href: '#', submenu: [
      { label: 'Financial Overview', icon: '📊', href: '/sbu/trucking/reporting' },
      { label: 'GPS Tracking', icon: '🛰️', href: '/sbu/trucking/reporting/gps-tracking' },
      { label: 'WO Financial', icon: '📋', href: '/sbu/trucking/reporting/wo-level' },
    ]},
  ],
  sbu_admin_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Quotations', icon: '📄', href: '/sbu/trucking/approvals' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/trucking/add-cost' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
    { label: 'Reporting', icon: '📊', href: '#', submenu: [
      { label: 'Financial Overview', icon: '📊', href: '/sbu/trucking/reporting' },
      { label: 'GPS Tracking', icon: '🛰️', href: '/sbu/trucking/reporting/gps-tracking' },
      { label: 'WO Financial', icon: '📋', href: '/sbu/trucking/reporting/wo-level' },
    ]},
  ],
  sbu_fin_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/trucking/add-cost' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
    { label: 'Reporting', icon: '📊', href: '#', submenu: [
      { label: 'Financial Overview', icon: '📊', href: '/sbu/trucking/reporting' },
      { label: 'GPS Tracking', icon: '🛰️', href: '/sbu/trucking/reporting/gps-tracking' },
      { label: 'WO Financial', icon: '📋', href: '/sbu/trucking/reporting/wo-level' },
    ]},
  ],
  sbu_finance_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/trucking/add-cost' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
    { label: 'Reporting', icon: '📊', href: '#', submenu: [
      { label: 'Financial Overview', icon: '📊', href: '/sbu/trucking/reporting' },
      { label: 'GPS Tracking', icon: '🛰️', href: '/sbu/trucking/reporting/gps-tracking' },
      { label: 'WO Financial', icon: '📋', href: '/sbu/trucking/reporting/wo-level' },
    ]},
  ],

  // SBU Warehouse (Manager, Ops, Admin)
  sbu_manager_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Quotations', icon: '📄', href: '/sbu/warehouse/approvals' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Orders', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { 
      label: 'Job Orders', icon: '🚛', href: '#',
      submenu: [
        { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
        { label: 'Repacking & Bundling', icon: '📦', href: '/sbu/warehouse/repacking' },
        { label: 'Parcel Consolidation', icon: '📑', href: '/sbu/warehouse/consolidation' },
        { label: 'Movements', icon: '🔄', href: '/sbu/warehouse/movements' },
        { label: 'Transfers (JO)', icon: '🚛', href: '/sbu/warehouse/transfers' },
        { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
      ]
    },
    { label: 'Inventory Report', icon: '📊', href: '#',
      submenu: [
        { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory-report/inventory' },
        { label: 'Stock Card', icon: '📋', href: '/sbu/warehouse/inventory-report/stock-card' },
      ]
    },

    { label: 'Stock Opname', icon: '📋', href: '/sbu/warehouse/stock-opname' },
    { label: 'Movement Log', icon: '📜', href: '/sbu/warehouse/movement-log' },
    { label: 'Finances', icon: '💰', href: '/sbu/warehouse/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/warehouse/documents' },
    { label: 'Ground Staff', icon: '👥', href: '/sbu/warehouse/staff' },
    { label: 'B2B Client Portal Access', icon: '🔑', href: '/sbu/warehouse/clients' },
  ],
  sbu_ops_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Quotations', icon: '📄', href: '/sbu/warehouse/approvals' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Orders', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { 
      label: 'Job Orders', icon: '🚛', href: '#',
      submenu: [
        { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
        { label: 'Repacking & Bundling', icon: '📦', href: '/sbu/warehouse/repacking' },
        { label: 'Parcel Consolidation', icon: '📑', href: '/sbu/warehouse/consolidation' },
        { label: 'Movements', icon: '🔄', href: '/sbu/warehouse/movements' },
        { label: 'Transfers (JO)', icon: '🚛', href: '/sbu/warehouse/transfers' },
        { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
      ]
    },
    { label: 'Inventory Report', icon: '📊', href: '#',
      submenu: [
        { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory-report/inventory' },
        { label: 'Stock Card', icon: '📋', href: '/sbu/warehouse/inventory-report/stock-card' },
      ]
    },

    { label: 'Stock Opname', icon: '📋', href: '/sbu/warehouse/stock-opname' },
    { label: 'Movement Log', icon: '📜', href: '/sbu/warehouse/movement-log' },
    { label: 'Ground Staff', icon: '👥', href: '/sbu/warehouse/staff' },
  ],
  sbu_admin_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Quotations', icon: '📄', href: '/sbu/warehouse/approvals' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Orders', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { 
      label: 'Job Orders', icon: '🚛', href: '#',
      submenu: [
        { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
        { label: 'Repacking & Bundling', icon: '📦', href: '/sbu/warehouse/repacking' },
        { label: 'Parcel Consolidation', icon: '📑', href: '/sbu/warehouse/consolidation' },
        { label: 'Movements', icon: '🔄', href: '/sbu/warehouse/movements' },
        { label: 'Transfers (JO)', icon: '🚛', href: '/sbu/warehouse/transfers' },
        { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
      ]
    },
    { label: 'Inventory Report', icon: '📊', href: '#',
      submenu: [
        { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory-report/inventory' },
        { label: 'Stock Card', icon: '📋', href: '/sbu/warehouse/inventory-report/stock-card' },
      ]
    },

    { label: 'Stock Opname', icon: '📋', href: '/sbu/warehouse/stock-opname' },
    { label: 'Movement Log', icon: '📜', href: '/sbu/warehouse/movement-log' },
    { label: 'Finances', icon: '💰', href: '/sbu/warehouse/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/warehouse/documents' },
    { label: 'Ground Staff', icon: '👥', href: '/sbu/warehouse/staff' },
    { label: 'B2B Client Portal Access', icon: '🔑', href: '/sbu/warehouse/clients' },
  ],

  // SBU Finance Warehouse
  sbu_fin_wh: [
    { label: 'Finance Dashboard', icon: '📊', href: '/sbu/warehouse/finances' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/warehouse/add-cost' },
    { label: 'Documents', icon: '📄', href: '/sbu/warehouse/documents' },
  ],

  // SBU Finance Forwarding
  sbu_fin_fwd: [
    { label: 'Finance Dashboard', icon: '📊', href: '/sbu/forwarding/finances' },
    { label: 'Cost Management', icon: '💰', href: '/sbu/forwarding/add-cost' },
    { label: 'Documents', icon: '📄', href: '/sbu/forwarding/documents' },
  ],

  // SBU Forwarding (Manager, Ops, Admin)
  sbu_manager_fwd: [
    { label: 'Work Order', icon: '📋', href: '/sbu/forwarding/wo' },
    { label: 'Create WO', icon: '➕', href: '/sbu/forwarding/wo/create' },
    { label: 'Konsolidasi', icon: '🚢', href: '/sbu/forwarding/consol' },
    { label: 'Master Harga', icon: '💰', href: '/sbu/forwarding/master/price' },
    { label: 'Finances', icon: '📊', href: '/sbu/forwarding/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/forwarding/documents' },
  ],
  sbu_ops_fwd: [
    { label: 'Work Order', icon: '📋', href: '/sbu/forwarding/wo' },
    { label: 'Create WO', icon: '➕', href: '/sbu/forwarding/wo/create' },
    { label: 'Konsolidasi', icon: '🚢', href: '/sbu/forwarding/consol' },
    { label: 'Master Harga', icon: '💰', href: '/sbu/forwarding/master/price' },
    { label: 'Finances', icon: '📊', href: '/sbu/forwarding/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/forwarding/documents' },
  ],
  sbu_admin_fwd: [
    { label: 'Work Order', icon: '📋', href: '/sbu/forwarding/wo' },
    { label: 'Create WO', icon: '➕', href: '/sbu/forwarding/wo/create' },
    { label: 'Konsolidasi', icon: '🚢', href: '/sbu/forwarding/consol' },
    { label: 'Master Harga', icon: '💰', href: '/sbu/forwarding/master/price' },
    { label: 'Finances', icon: '📊', href: '/sbu/forwarding/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/forwarding/documents' },
  ],
  cs_forwarding: [
    { label: 'Work Order', icon: '📋', href: '/sbu/forwarding/wo' },
    { label: 'Konsolidasi', icon: '🚢', href: '/sbu/forwarding/consol' },
    { label: 'Tracking', icon: '📍', href: '/sbu/forwarding/tracking' },
  ],

  // Driver
  driver: [
    { label: 'My Jobs', icon: '🚚', href: '/driver/jobs' },
    { label: 'Tracking', icon: '📍', href: '/driver/tracking' },
    { label: 'My Report', icon: '📊', href: '/driver/report' },
  ],

  // Default (tenant_admin legacy)
  tenant_admin: [
    { label: 'Dashboard', icon: '🏠', href: '/tenant' },
    { label: 'SBU Configuration', icon: '🏢', href: '/tenant/sbu' },
    { label: 'Staff Management', icon: '👥', href: '/tenant/staff' },
    {
      label: 'Master Data', icon: '🗂️', href: '#',
      submenu: [
        { label: 'Contacts', icon: '📇', href: '/tenant/master/contacts' },
        { label: 'Locations', icon: '📍', href: '/tenant/master/locations' },
      ]
    },
    {
      label: 'SBU Warehouse', icon: '🏭', href: '#', requiresSbu: 'wh',
      submenu: [
        { label: 'Master Categories', icon: '🗂️', href: '/hq/master-data/categories' },
        { label: 'Master Products', icon: '📦', href: '/hq/master-data/products' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/tenant/warehouse/locations' },
        { label: 'Work Orders', icon: '📋', href: '/sbu/warehouse/work-orders' },
        { 
          label: 'Job Orders', icon: '🚛', href: '#',
          submenu: [
            { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
            { label: 'Repacking & Bundling', icon: '📦', href: '/sbu/warehouse/repacking' },
            { label: 'Parcel Consolidation', icon: '📑', href: '/sbu/warehouse/consolidation' },
            { label: 'Movements', icon: '🔄', href: '/sbu/warehouse/movements' },
            { label: 'Transfers', icon: '🚛', href: '/sbu/warehouse/transfers' },
            { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
          ]
        },
        { label: 'Stock Opname', icon: '📋', href: '/sbu/warehouse/stock-opname' },
        { label: 'Movement Log', icon: '📜', href: '/sbu/warehouse/movement-log' },
      ]
    },
    {
      label: 'SBU Trucking', icon: '🚛', href: '#', requiresSbu: 'tr',
      submenu: [
        { label: 'SBU Config', icon: '⚙️', href: '/tenant/trucking' },
        { label: 'Fleet Types', icon: '🚛', href: '/tenant/master/fleet-types' },
        { label: 'Tarif Uang Jalan', icon: '💵', href: '/tenant/master/driver-allowances' },
        { label: 'Fleets', icon: '🚚', href: '/tenant/master/fleets' },
        { label: 'Drivers', icon: '👤', href: '/tenant/master/drivers' },
      ]
    },
    { label: 'Token Balance', icon: '💰', href: '/tenant/token' },
    { label: 'Company Profile', icon: '⚙️', href: '/tenant/profile' },
  ],
};

export default function Sidebar({ isOpen, onClose, onLinkClick }: { isOpen: boolean, onClose: () => void, onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { t } = useLanguage();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['Master Data']);
  const [tenantLogo, setTenantLogo] = useState('');
  const [activeSbus, setActiveSbus] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('logo_url').eq('id', profile.tenant_id).single()
        .then(({data, error}) => {
           if (!error && data?.logo_url) setTenantLogo(data.logo_url);
        });
      // Fetch active SBU types for this tenant
      supabase.from('tenant_sbus').select('sbu_type').eq('tenant_id', profile.tenant_id).eq('status', 'active')
        .then(({data, error}) => {
           if (!error && data) setActiveSbus(new Set(data.map((s: any) => s.sbu_type)));
        });
    }
  }, [profile?.tenant_id]);

  const role = profile?.role || 'tenant_admin';

  // [AI] Universal recursive filter based on active SBU status
  const filterBySbu = (items: MenuItem[]): MenuItem[] => {
    // Only bypass for non-tenant entities (owner & driver)
    // ALL tenant users (superadmin, admin, hq, sbu) MUST respect the tenant's active SBUs
    if (role === 'owner_sentralogis' || role === 'driver') return items;

    return items.reduce<MenuItem[]>((acc, item) => {
      // If item requires a specific SBU and it's not active, hide it entirely
      if (item.requiresSbu && !activeSbus.has(item.requiresSbu)) {
        return acc;
      }

      // If item has submenu, filter the submenu recursively
      if (item.submenu) {
        const filteredSubs = filterBySbu(item.submenu);
        // If submenu becomes empty after filtering, and this is just a folder (href '#'), hide the folder
        if (filteredSubs.length === 0 && item.href === '#') {
          return acc;
        }
        acc.push({ ...item, submenu: filteredSubs.length > 0 ? filteredSubs : undefined });
      } else {
        acc.push(item);
      }
      
      return acc;
    }, []);
  };

  const rawMenuItems = MENU_CONFIG[role] ?? MENU_CONFIG.tenant_admin;
  const menuItems = filterBySbu(Array.isArray(rawMenuItems) ? rawMenuItems : []);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r border-slate-200 fixed lg:relative inset-y-0 left-0 z-50">
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading session...</p>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container (Slide Out / Slide In across all Sentralogis dashboards) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col shrink-0
        ${isOpen 
          ? 'translate-x-0 w-64 opacity-100' 
          : '-translate-x-full lg:translate-x-0 w-0 lg:w-0 opacity-0 overflow-hidden border-none pointer-events-none'
        }
        ${isOpen ? 'lg:static lg:inset-0' : 'lg:static'}
      `}>
        <div className="w-64 h-full flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                {tenantLogo ? <img src={tenantLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-tighter text-slate-900 uppercase line-clamp-1 leading-tight">
                  {profile?.full_name || 'Admin'}
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                  {profile?.tenants?.name || 'Tenant'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600 rounded-lg transition-all flex items-center justify-center"
              title="Sembunyikan Menu Sidebar"
            >
              <ChevronLeft size={20} className="hidden lg:block" />
              <X size={20} className="block lg:hidden" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const renderMenuNode = (node: MenuItem, depth: number = 0) => {
                const hasSubmenu = node.submenu && node.submenu.length > 0;
                const isSubmenuOpen = openSubmenus.includes(node.label);
                
                const checkActive = (n: MenuItem): boolean => {
                  if (pathname === n.href) return true;
                  if (n.submenu) return n.submenu.some(checkActive);
                  return false;
                };
                const isActive = checkActive(node);

                return (
                  <div key={node.label} className="space-y-1">
                    {hasSubmenu ? (
                      <button
                        onClick={() => toggleSubmenu(node.label)}
                        className={`
                          w-full flex items-center justify-between py-2 rounded-lg transition-all
                          ${depth === 0 ? 'px-3 mt-1' : 'px-2'}
                          ${isActive ? 'bg-slate-50 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {node.icon && <span className={depth === 0 ? 'text-lg' : 'text-base'}>{node.icon}</span>}
                          <span className="text-sm">{t.sidebar?.[node.label] || node.label}</span>
                        </div>
                        {isSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <Link
                        href={node.href}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                          if (onLinkClick) onLinkClick();
                        }}
                        className={`
                          flex items-center gap-3 py-2 rounded-lg transition-all
                          ${depth === 0 ? 'px-3' : 'px-2'}
                          ${isActive 
                            ? (depth === 0 ? 'bg-slate-900 text-white font-medium shadow-md' : 'text-slate-900 font-semibold bg-slate-50')
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }
                        `}
                      >
                        {node.icon && <span className={depth === 0 ? 'text-lg' : 'text-base'}>{node.icon}</span>}
                        <span className="text-sm">{t.sidebar?.[node.label] || node.label}</span>
                      </Link>
                    )}

                    {hasSubmenu && isSubmenuOpen && (
                      <div className={`${depth === 0 ? 'ml-4 pl-4 border-l border-slate-100' : 'ml-3 pl-3 border-l border-slate-100'} space-y-1 mt-1`}>
                        {node.submenu!.map(sub => renderMenuNode(sub, depth + 1))}
                      </div>
                    )}
                  </div>
                );
              };
              return renderMenuNode(item, 0);
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase">{role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
