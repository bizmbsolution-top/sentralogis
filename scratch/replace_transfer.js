const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, '..', 'app', '(dashboard)', 'sbu', 'warehouse', 'transfers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace text labels
  content = content.replace(/SBUOutboundPage/g, 'SBUTransferPage');
  content = content.replace(/Outbound/g, 'Transfer');
  content = content.replace(/outbound/g, 'transfer');
  content = content.replace(/OUTBOUND/g, 'TRANSFER');
  
  // Replace DB tables
  content = content.replace(/wh_transfer_shipments/g, 'wh_transfer_orders');
  content = content.replace(/shipment_number/g, 'transfer_number');
  content = content.replace(/shipment_id/g, 'transfer_id');
  content = content.replace(/wh_transfer_shipment_items/g, 'wh_transfer_details');
  
  // Note: create_warehouse_transfer RPC uses from_warehouse_id
  content = content.replace(/\.eq\('warehouse_id', whId\)/g, ".eq('from_warehouse_id', whId)");
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(dirPath);
