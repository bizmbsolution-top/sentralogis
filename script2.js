const fs = require('fs');
let content = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');

// Use regex to replace to avoid line ending issues
const masterRegex = /const MOD_MASTER_DATA_HQ: MenuItem = {[\s\S]*?\]\r?\n};/;
const newMasterData = `const MOD_MASTER_DATA_HQ: MenuItem = {
  label: 'Master Data', icon: '🗂️', href: '#',
  submenu: [
    { label: 'Contacts', icon: '📇', href: '/hq/master/contacts' },
    { label: 'Locations', icon: '📍', href: '/hq/master/locations' },
    { label: 'Services & Charges', icon: '🏷️', href: '/hq/master/services' },
  ]
};`;
content = content.replace(masterRegex, newMasterData);

const truckingRegex = /const MOD_TRUCKING_HQ: MenuItem\[\] = \[[\s\S]*?\];/;
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
content = content.replace(truckingRegex, newTrucking);

content = content.replace(/\.\.\.MOD_TRUCKING_HQ,/g, '...MOD_GLOBAL_OPS_HQ, MOD_TRUCKING_HQ,');

fs.writeFileSync('components/layout/Sidebar.tsx', content);
console.log("Replacement done");
