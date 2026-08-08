import { NextResponse } from 'next/server';

export async function GET() {
  // Read-only inbox endpoint — never mutates data
  const inboxItems = [
    {
      id: 'item-1',
      title: 'Delay Alert: Traffic on Toll Jakarta-Cikampek',
      subtitle: 'JO-10291 • Driver Budi S.',
      category: 'ALERT',
      priority: 'HIGH',
      timestamp: '10 mins ago',
      details: { jobId: 'JO-10291', driverId: 'DRV-001', vehicleId: 'VEH-992' }
    },
    {
      id: 'item-2',
      title: 'Proof of Delivery Uploaded',
      subtitle: 'JO-10285 • Customer PT Maju Jaya',
      category: 'DOCUMENT',
      priority: 'NORMAL',
      timestamp: '25 mins ago',
      details: { jobId: 'JO-10285', driverId: 'DRV-002', vehicleId: 'VEH-911', customerId: 'CUST-102' }
    },
    {
      id: 'item-3',
      title: 'Vehicle Breakdown Reported',
      subtitle: 'VEH-821 • Near Subang',
      category: 'CRITICAL',
      priority: 'URGENT',
      timestamp: '1 hour ago',
      details: { jobId: 'JO-10299', driverId: 'DRV-003', vehicleId: 'VEH-821' }
    },
    {
      id: 'item-4',
      title: 'WhatsApp Message: Customer Asking ETA',
      subtitle: 'PT Lintas Samudra • JO-10288',
      category: 'MESSAGE',
      priority: 'HIGH',
      timestamp: '1 hour ago',
      details: { jobId: 'JO-10288', customerId: 'CUST-205' }
    },
    {
      id: 'item-5',
      title: 'New Job Assignment Request',
      subtitle: 'Container 40ft • Tanjung Priok to Cikarang',
      category: 'DISPATCH',
      priority: 'NORMAL',
      timestamp: '2 hours ago',
      details: { containerId: 'CONT-40992' }
    },
    {
      id: 'item-6',
      title: 'Expense Claim: Toll & Parking',
      subtitle: 'Driver Agus W. • Rp 150,000',
      category: 'FINANCE',
      priority: 'LOW',
      timestamp: '3 hours ago',
      details: { driverId: 'DRV-004' }
    },
    {
      id: 'item-7',
      title: 'Maintenance Due: Oil Change',
      subtitle: 'VEH-105 • B 9920 TQ',
      category: 'MAINTENANCE',
      priority: 'NORMAL',
      timestamp: '4 hours ago',
      details: { vehicleId: 'VEH-105' }
    },
    {
      id: 'item-8',
      title: 'Customer Feedback: Late Arrival',
      subtitle: 'PT Sinar Mas • JO-10200',
      category: 'FEEDBACK',
      priority: 'HIGH',
      timestamp: '5 hours ago',
      details: { jobId: 'JO-10200', customerId: 'CUST-301' }
    },
    {
      id: 'item-9',
      title: 'Document Missing: Surat Jalan',
      subtitle: 'JO-10255 • Delivery to Semarang',
      category: 'DOCUMENT',
      priority: 'HIGH',
      timestamp: '6 hours ago',
      details: { jobId: 'JO-10255' }
    },
    {
      id: 'item-10',
      title: 'System Alert: GPS Signal Lost',
      subtitle: 'VEH-332 • Last seen: Cirebon',
      category: 'ALERT',
      priority: 'CRITICAL',
      timestamp: '6 hours ago',
      details: { vehicleId: 'VEH-332', driverId: 'DRV-005' }
    },
    {
      id: 'item-11',
      title: 'WhatsApp Image Received',
      subtitle: 'Driver Joko: "Ban bocor pak"',
      category: 'MESSAGE',
      priority: 'HIGH',
      timestamp: '7 hours ago',
      details: { driverId: 'DRV-006' }
    },
    {
      id: 'item-12',
      title: 'Schedule Change Request',
      subtitle: 'PT Gudang Garam • Delivery postponed to tomorrow',
      category: 'DISPATCH',
      priority: 'NORMAL',
      timestamp: '8 hours ago',
      details: { customerId: 'CUST-400' }
    }
  ];
  
  return NextResponse.json({ success: true, items: inboxItems });
}
