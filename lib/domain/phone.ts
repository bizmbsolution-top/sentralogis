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
}): string {
  const { driverName, isInternal, link } = params;
  if (isInternal) {
    return `Halo ${driverName}, Anda mendapat tugas baru. Silakan buka aplikasi Driver Portal Anda untuk mengecek dan menerima tugas: ${link}`;
  }
  return `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda: ${link}`;
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
