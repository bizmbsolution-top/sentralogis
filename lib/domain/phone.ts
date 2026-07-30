/** Normalize Indonesian phone numbers for wa.me links (62…). */
export function normalizePhoneToWa(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  } else if (formatted.startsWith('8')) {
    formatted = '62' + formatted;
  }
  return formatted;
}

export function buildWaLink(phone: string, message: string): string {
  const normalized = normalizePhoneToWa(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildDriverAssignmentMessage(params: {
  driverName: string;
  isInternal: boolean;
  link: string;
  joNumber?: string;
}): string {
  const { driverName, isInternal, link, joNumber } = params;
  const joText = joNumber ? ` (${joNumber})` : '';
  if (isInternal) {
    return `Halo ${driverName}, Anda mendapat tugas baru${joText}. Silakan buka aplikasi Driver Portal Anda untuk mengecek dan menerima tugas: ${link}`;
  }
  return `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda${joText}: ${link}`;
}

export function buildCustomerTrackingMessage(params: {
  customerName: string;
  woNumber: string;
  joNumber: string;
  link: string;
}): string {
  const { customerName, woNumber, joNumber, link } = params;
  return `Halo ${customerName},\n\nBerikut adalah link pelacakan untuk pengiriman Anda (${joNumber}) menggunakan armada pada WO ${woNumber}:\n\n${link}\n\nTerima kasih telah menggunakan Sentralogis.`;
}

export function buildVendorInquiryMessage(params: {
  woNumber: string;
  tenantName: string;
  vehicleType: string;
  qty: number;
  origin: string;
  destination: string;
  budgetPerUnit: number;
}): string {
  const { woNumber, tenantName, vehicleType, qty, origin, destination, budgetPerUnit } = params;
  const budget = Number(budgetPerUnit || 0).toLocaleString('id-ID');
  return [
    `🚛 *ORDER BARU - WO ${woNumber}*`,
    ``,
    `Dari: ${tenantName}`,
    `Tipe: ${vehicleType}`,
    `Jumlah: ${qty} unit`,
    `Rute: ${origin} → ${destination}`,
    `Budget: Rp ${budget}/unit`,
    ``,
    `Minat? Balas jumlah & harga yang Anda tawarkan.`,
  ].join('\n');
}

export function buildGroundStaffNotificationMessage(params: {
  woNumber: string;
  tenantName: string;
  executionDate: string;
  executionTime: string;
  siteName: string;
  origin: string;
  destination: string;
  truckCount: number;
  link: string;
}): string {
  const { woNumber, tenantName, executionDate, executionTime, siteName, origin, destination, truckCount, link } = params;
  return [
    `📋 *GROUND STAFF — WO ${woNumber}*`,
    ``,
    `Tenant: ${tenantName}`,
    `Tanggal: ${executionDate}`,
    `Jam: ${executionTime}`,
    siteName ? `Lokasi: ${siteName}` : null,
    `Rute: ${origin || '-'} → ${destination || '-'}`,
    `Jumlah Truk: ${truckCount || '-'} unit`,
    ``,
    `Silakan buka aplikasi Ground Staff untuk proses Gate In/Out:`,
    link,
  ].filter(Boolean).join('\n');
}
