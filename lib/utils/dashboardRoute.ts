// lib/utils/dashboardRoute.ts
export const getDashboardRoute = (role: string, isMobile: boolean = false) => {
  // Director roles land on their respective exception dashboards
  if (role === 'hq_director_ops') return '/director/ops';
  if (role === 'hq_director_fin') return '/director/finance';
  if (role === 'hq_director_comm') return '/director/commercial';
  if (role === 'hq_director_bizdev') return '/director/bizdev';
  if (role === 'hq_director_hrd') return '/director/hrd';
  if (role === 'hq_director_cs') return '/director/cs'; // Fallback for cs if any
  
  if (role.startsWith('hq_director_')) {
    return '/hq/business'; // Generic fallback if new director roles are added
  }
  switch (role) {
    case 'owner_sentralogis':
      return '/owner';
    case 'tenant_superadmin':
      return '/tenant';
    case 'hq_commercial_director':
    case 'hq_sales_manager':
    case 'hq_marketing_staff':
      return '/commercial/leads';
    case 'hq_sales_staff':
      // Route Sales to Mobile PWA if on mobile, else to Desktop CRM
      return isMobile ? '/portal/sales' : '/commercial/leads';
    case 'hq_pricing_analyst':
      return '/commercial/pipeline'; // or a billing/pricing dashboard
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
    case 'sbu_manager_fwd':
    case 'sbu_ops_fwd':
    case 'sbu_admin_fwd':
      return '/sbu/forwarding/wo';
    case 'cs_forwarding':
      return '/sbu/forwarding/wo';
    case 'driver':
      return '/driver/jobs';
    case 'warehouse_customer':
      return '/customer/warehouse';
    case 'tenant_admin':
      return '/tenant';
    default:
      if (role.startsWith('hq_')) return '/hq/sbu-activities';
      if (role.startsWith('sbu_')) return '/sbu/trucking';
      return '/tenant';
  }
};
