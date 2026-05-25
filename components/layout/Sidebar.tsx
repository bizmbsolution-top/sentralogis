'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Building } from 'lucide-react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  submenu?: MenuItem[];
}

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
      label: 'SBU Trucking', icon: '🚛', href: '#',
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
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
        { label: 'Master COA', icon: '📖', href: '/hq/finance/coa' },
      ]
    },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/tenant/warehouse/locations' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
        { label: 'Contract & Billing', icon: '💰', href: '/hq/warehouse/billing' },
      ]
    },
    { label: 'Company Profile', icon: '⚙️', href: '/tenant/profile' },
  ],

  // HQ Staff (CS - Ops - Finances)
  hq_cs: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    { label: 'Work Order', icon: '📋', href: '/hq/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/hq/job-orders' },
    { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/hq/warehouse/locations' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
      ]
    },
    {
      label: 'Master Data', icon: '🗂️', href: '#',
      submenu: [
        { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
        { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
        { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types' },
        { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets' },
        { label: 'Drivers', icon: '👤', href: '/hq/master/drivers' },
      ]
    },
  ],
  hq_ops: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    { label: 'Work Order', icon: '📋', href: '/hq/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/hq/job-orders' },
    { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/hq/warehouse/locations' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
      ]
    },
    {
      label: 'Master Data', icon: '🗂️', href: '#',
      submenu: [
        { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
        { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
        { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types' },
        { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets' },
        { label: 'Drivers', icon: '👤', href: '/hq/master/drivers' },
      ]
    },
  ],
  hq_finance: [
    { label: 'Executive Dashboard', icon: '💎', href: '/hq/business' },
    { label: 'Ops Dashboard', icon: '🏠', href: '/hq/ops-dashboard' },
    { label: 'Work Order', icon: '📋', href: '/hq/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/hq/job-orders' },
    { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Locations & Zones', icon: '🗺️', href: '/hq/warehouse/locations' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Contract & Billing', icon: '💰', href: '/hq/warehouse/billing' },
      ]
    },
    {
      label: 'Master Data', icon: '🗂️', href: '#',
      submenu: [
        { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
        { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
        { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types' },
        { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets' },
        { label: 'Drivers', icon: '👤', href: '/hq/master/drivers' },
      ]
    },
  ],

  // ============================================
  // EXECUTIVE COMMAND SUITE (Shared by all Directors)
  // ============================================
  hq_director_ops: [
    { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
    { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management' },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
      ]
    },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],
  hq_director_fin: [
    { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
    { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management' },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Contract & Billing', icon: '💰', href: '/hq/warehouse/billing' },
      ]
    },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],
  hq_director_cs: [
    { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
    { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management' },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
      ]
    },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],
  hq_director_comm: [
    { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
    { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management' },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
      ]
    },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],
  hq_director_bizdev: [
    { label: 'Executive Suite', icon: '💎', href: '/hq/business' },
    { label: 'Ops Command', icon: '🏠', href: '/hq/ops-dashboard' },
    {
      label: 'Finance Matrix', icon: '💰', href: '#',
      submenu: [
        { label: 'Finance Summary', icon: '📊', href: '/hq/finance/summary' },
        { label: 'AR = Invoicing', icon: '🧾', href: '/hq/invoice-customer' },
        { label: 'AP = Purchase', icon: '💳', href: '/hq/finance/cost-audit' },
      ]
    },
    { label: 'Mission Radar', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Fleet Readiness', icon: '🚛', href: '/hq/fleet-management' },
    {
      label: 'Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Overview', icon: '📊', href: '/hq/warehouse' },
        { label: 'Inbound', icon: '📥', href: '/hq/warehouse/inbound' },
        { label: 'Outbound', icon: '📤', href: '/hq/warehouse/outbound' },
        { label: 'Inventory', icon: '📦', href: '/hq/warehouse/inventory' },
        { label: 'Customer Stock', icon: '👁️', href: '/hq/warehouse/customer-stock' },
      ]
    },
    { label: 'Reporting', icon: '📊', href: '/hq/reporting' },
    { label: 'Organization', icon: '👥', href: '/tenant/staff' },
  ],

  // SBU Roles (Manager, Ops, Admin, Finances)
  sbu_manager_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
  ],
  sbu_ops_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
  ],
  sbu_admin_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
  ],
  sbu_fin_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
  ],
  sbu_finance_tr: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/trucking' },
    { label: 'Work Order', icon: '📋', href: '/sbu/trucking/work-orders' },
    { label: 'Job Order', icon: '🚛', href: '/sbu/trucking/assignments' },
    { label: 'Intelligence Tower', icon: '📍', href: '/sbu/trucking/tracking' },
    { label: 'Documents & Finances', icon: '🧾', href: '/sbu/trucking/completed' },
    { label: 'Driver Performance', icon: '📊', href: '/sbu/trucking/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/sbu/trucking/fleet-performance' },
  ],

  // SBU Warehouse (Manager, Ops, Admin)
  sbu_manager_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Order', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
    { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
    { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory' },
    { label: 'Finances', icon: '💰', href: '/sbu/warehouse/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/warehouse/documents' },
  ],
  sbu_ops_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Order', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
    { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
    { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory' },
  ],
  sbu_admin_wh: [
    { label: 'Ops Dashboard', icon: '📊', href: '/sbu/warehouse' },
    { label: 'Attendance', icon: '📍', href: '/sbu/warehouse/attendance' },
    { label: 'Work Order', icon: '📋', href: '/sbu/warehouse/work-orders' },
    { label: 'Inbound', icon: '📥', href: '/sbu/warehouse/inbound' },
    { label: 'Outbound', icon: '📤', href: '/sbu/warehouse/outbound' },
    { label: 'Inventory', icon: '📦', href: '/sbu/warehouse/inventory' },
    { label: 'Finances', icon: '💰', href: '/sbu/warehouse/finances' },
    { label: 'Documents', icon: '📄', href: '/sbu/warehouse/documents' },
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
      label: 'SBU Warehouse', icon: '🏭', href: '#',
      submenu: [
        { label: 'Locations & Zones', icon: '🗺️', href: '/tenant/warehouse/locations' },
      ]
    },
    {
      label: 'SBU Trucking', icon: '🚛', href: '#',
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

export default function Sidebar({ isOpen, onClose, onLinkClick }: { isOpen: boolean; onClose: () => void; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['Master Data']);
  const [tenantLogo, setTenantLogo] = useState('');

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('logo_url').eq('id', profile.tenant_id).single()
        .then(({data, error}) => {
           if (!error && data?.logo_url) setTenantLogo(data.logo_url);
        });
    }
  }, [profile?.tenant_id]);

  const role = profile?.role || 'tenant_admin';
  const menuItems = MENU_CONFIG[role] || MENU_CONFIG.tenant_admin;

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

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 flex flex-col
      `}>
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
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = openSubmenus.includes(item.label);
            const isActive = pathname === item.href || (hasSubmenu && item.submenu?.some(sub => pathname === sub.href));

            return (
              <div key={item.label} className="space-y-1">
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all
                      ${isActive ? 'bg-slate-50 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {isSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                      // [AI] Removed router.refresh() to allow smooth Next.js client-side transition
                      if (onLinkClick) onLinkClick();
                    }}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive 
                        ? 'bg-slate-900 text-white font-medium shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )}

                {hasSubmenu && isSubmenuOpen && (
                  <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1">
                    {item.submenu?.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                            // [AI] Removed router.refresh() to allow smooth Next.js client-side transition
                            if (onLinkClick) onLinkClick();
                          }}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                            ${isSubActive 
                              ? 'text-slate-900 font-semibold bg-slate-50' 
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
                            }
                          `}
                        >
                          <span>{sub.icon}</span>
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
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
      </aside>
    </>
  );
}
