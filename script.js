const fs = require('fs');
let content = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');

// Replace MOD_MASTER_DATA_HQ
const oldMasterData = `const MOD_MASTER_DATA_HQ: MenuItem = {
  label: 'Master Data', icon: '🗂️', href: '#',
  submenu: [
    { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
    { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
    { label: 'Wilayah Kerja', icon: '📍', href: '/hq/master/trucking-regions' },
    { label: 'Services & Charges', icon: '🏷️', href: '/hq/master/services' },
    { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types', requiresSbu: 'tr' },
    { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets', requiresSbu: 'tr' },
    { label: 'Drivers', icon: '👤', href: '/hq/master/drivers', requiresSbu: 'tr' },
  ]
};`;

const newMasterData = `const MOD_MASTER_DATA_HQ: MenuItem = {
  label: 'Master Data', icon: '🗂️', href: '#',
  submenu: [
    { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
    { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
    { label: 'Services & Charges', icon: '🏷️', href: '/hq/master/services' },
  ]
};`;

content = content.replace(oldMasterData, newMasterData);

// Replace MOD_TRUCKING_HQ
const oldTrucking = `const MOD_TRUCKING_HQ: MenuItem[] = [
  { label: 'Work Order', icon: '📋', href: '/hq/work-orders', requiresSbu: 'tr' },
  { label: 'Job Order', icon: '🚛', href: '/hq/job-orders', requiresSbu: 'tr' },
  { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities', requiresSbu: 'tr' },
  { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance', requiresSbu: 'tr' },
  { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance', requiresSbu: 'tr' },
];`;

const newTrucking = `const MOD_GLOBAL_OPS_HQ: MenuItem[] = [
  { label: 'Work Order', icon: '📋', href: '/hq/work-orders' },
  { label: 'Job Order', icon: '🚛', href: '/hq/job-orders' },
];

const MOD_TRUCKING_HQ: MenuItem = {
  label: 'Trucking', icon: '🚚', href: '#', requiresSbu: 'tr',
  submenu: [
    { label: 'Intelligence Tower', icon: '📍', href: '/hq/sbu-activities' },
    { label: 'Driver Performance', icon: '📊', href: '/hq/driver-performance' },
    { label: 'Fleet Performance', icon: '🔧', href: '/hq/fleet-performance' },
    { label: 'Wilayah Kerja', icon: '📍', href: '/hq/master/trucking-regions' },
    { label: 'Fleet Types', icon: '🚛', href: '/hq/master/fleet-types' },
    { label: 'Transporters', icon: '🚚', href: '/hq/master/fleets' },
    { label: 'Drivers', icon: '👤', href: '/hq/master/drivers' },
  ]
};`;

content = content.replace(oldTrucking, newTrucking);

// Replace spread `...MOD_TRUCKING_HQ,` with `...MOD_GLOBAL_OPS_HQ, MOD_TRUCKING_HQ,`
content = content.replaceAll('...MOD_TRUCKING_HQ,', '...MOD_GLOBAL_OPS_HQ, MOD_TRUCKING_HQ,');

fs.writeFileSync('components/layout/Sidebar.tsx', content);
