// lib/utils/dashboardRoute.ts

/**
 * Post-Login Destination Authority
 *
 * Directs authenticated users to the Copilot-first workspace (/copilot/v2)
 * as the primary operating surface for Sentralogis, while preserving
 * dedicated portal routes for drivers and external warehouse customers.
 */
export const getDashboardRoute = (role: string, isMobile: boolean = false) => {
  // External / Dedicated Portal Roles
  if (role === 'driver') return '/driver/jobs';
  if (role === 'warehouse_customer') return '/customer/warehouse';
  if (role === 'ground_staff') return '/ground/dashboard';

  // Primary Post-Login Entry: Copilot-First Workspace
  return '/copilot/v2';
};

