// lib/utils/dashboardRoute.ts
export const getDashboardRoute = (role: string) => {
  // All director roles land on Executive Business Dashboard
  if (role.startsWith('hq_director_')) {
    return '/hq/business';
  }
  switch (role) {
    case 'owner_sentralogis':
      return '/owner';
    case 'tenant_superadmin':
      return '/tenant';
    case 'hq_cs':
      return '/hq/work-orders';
    case 'hq_ops':
      return '/hq/ops-dashboard';
    case 'hq_finance':
      return '/hq/token';
    case 'sbu_manager_tr':
      return '/sbu/trucking';
    case 'sbu_ops_tr':
      return '/sbu/trucking/work-orders';
    case 'sbu_fin_tr':
      return '/sbu/trucking/finances';
    case 'sbu_manager_wh':
      return '/sbu/warehouse';
    case 'sbu_ops_wh':
      return '/sbu/warehouse/inbound';
    case 'sbu_admin_wh':
      return '/sbu/warehouse';
    case 'sbu_fin_wh':
      return '/sbu/warehouse/finances';
    case 'sbu_fin_fwd':
      return '/sbu/forwarding/finances';
    case 'driver':
      return '/driver/jobs';
    case 'tenant_admin':
      return '/tenant';
    default:
      if (role.startsWith('hq_')) return '/hq/sbu-activities';
      if (role.startsWith('sbu_')) return '/sbu/trucking';
      return '/tenant';
  }
};
