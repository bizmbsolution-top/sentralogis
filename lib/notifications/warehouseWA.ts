interface ReceiptInfo {
  id: string;
  receipt_number: string;
  status: string;
  transporter_name_manual?: string;
  driver_name_manual?: string;
  driver_phone?: string;
  total_unloading_minutes?: number;
}

interface ItemInfo {
  product?: { name?: string; sku_code?: string };
  expected_qty?: number;
  actual_good_qty?: number;
  product_sku_id?: string;
}

interface DamageInfo {
  qty: number;
  damage_source: string;
  damage_condition: string;
  source_notes?: string;
  condition_notes?: string;
  decision?: string;
  receipt_item_id?: string;
}

function buildMessage(type: string, receipt: ReceiptInfo, extra?: string): string {
  switch (type) {
    case 'TRUCK_ARRIVED':
      return (
        `🚛 *TRUCK TIBA - ${receipt.receipt_number}*\n\n` +
        `Truk sudah tiba di gate.\n\n` +
        `📋 *No. Receipt:* ${receipt.receipt_number}\n` +
        `🚚 *Transporter:* ${receipt.transporter_name_manual || '-'}\n` +
        `👤 *Supir:* ${receipt.driver_name_manual || '-'}\n\n` +
        `⏳ Status: *MENUNGGU VALIDASI ADMIN*\n\n` +
        `_Silakan login ke dashboard untuk validasi._`
      );
    case 'UNLOADING':
      return (
        `⏱ *BONGKAR DIMULAI - ${receipt.receipt_number}*\n\n` +
        `Proses bongkar muat sudah dimulai oleh tim Tally.\n\n` +
        `📋 *No. Receipt:* ${receipt.receipt_number}\n` +
        `🚚 *Transporter:* ${receipt.transporter_name_manual || '-'}\n` +
        `👤 *Supir:* ${receipt.driver_name_manual || '-'}\n\n` +
        `⏳ Status: *UNLOADING IN PROGRESS*\n\n` +
        `_Pantau progress di dashboard._`
      );
    case 'CHECKING_DONE':
      return extra || `✅ *CHECKING SELESAI - ${receipt.receipt_number}*\n\nSilakan review hasil di dashboard.`;
    case 'PUTAWAY_IN_PROGRESS':
      return (
        `📦 *PUTAWAY DIMULAI - ${receipt.receipt_number}*\n\n` +
        `Admin telah menyetujui hasil checking. Barang siap dipindahkan ke rak.\n\n` +
        `📋 *No. Receipt:* ${receipt.receipt_number}\n` +
        `⏳ Status: *PUTAWAY IN PROGRESS*`
      );
    case 'COMPLETED':
      return extra || `✅ *PROSES INBOUND SELESAI - ${receipt.receipt_number}*\n\nSemua barang sudah tersimpan di gudang.`;
    default:
      return extra || `ℹ️ Update ${receipt.receipt_number}: ${type}`;
  }
}

async function sendViaApi(type: string, receipt: ReceiptInfo, message: string) {
  try {
    const res = await fetch('/api/wa-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        message,
        recipient: receipt.driver_phone || 'ADMIN',
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        recipientName: 'Admin Gudang',
      }),
    });
    const data = await res.json();
    if (!data.success) console.warn('[WA] Send failed:', data.error);
    return data;
  } catch (err) {
    console.warn('[WA] API call failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendTruckArrivedWA(receipt: ReceiptInfo) {
  const msg = buildMessage('TRUCK_ARRIVED', receipt);
  return sendViaApi('TRUCK_ARRIVED', receipt, msg);
}

export async function sendUnloadingStartWA(receipt: ReceiptInfo) {
  const msg = buildMessage('UNLOADING', receipt);
  return sendViaApi('UNLOADING', receipt, msg);
}

export async function sendCheckingDoneWA(
  receipt: ReceiptInfo,
  items: ItemInfo[],
  damages: DamageInfo[]
) {
  const totalGood = items.reduce((s, i) => s + Number(i.actual_good_qty || 0), 0);
  const totalDamage = damages.reduce((s, d) => s + Number(d.qty || 0), 0);
  const totalExpected = items.reduce((s, i) => s + Number(i.expected_qty || 0), 0);
  const overage = Math.max(0, totalGood - totalExpected);

  let damageSection = '';
  if (damages.length > 0) {
    const damageLines = damages.map((d, i) =>
      `  ${i + 1}. ${d.damage_source === 'TRANSPORTER' ? 'Dari Transporter' : 'Kelalaian Staf'} — ${d.qty} unit`
    ).join('\n');
    damageSection = `\n\n⚠️ *BARANG RUSAK:*\n${damageLines}`;
  }

  const msg = (
    `✅ *CHECKING SELESAI - ${receipt.receipt_number}*\n\n` +
    `Tim Tally telah menyelesaikan hitung fisik.\n\n` +
    `📋 *Ringkasan:*\n` +
    `  📦 Target: ${totalExpected} unit\n` +
    `  ✅ Bagus: ${totalGood} unit\n` +
    `  ❌ Rusak: ${totalDamage} unit` +
    (overage > 0 ? `\n  ⚠️ Kelebihan: ${overage} unit` : '') +
    damageSection +
    `\n\n⏳ Status: *MENUNGGU KEPUTUSAN ADMIN*\n\n` +
    `_Silakan review dan ambil keputusan di dashboard._`
  );
  return sendViaApi('CHECKING_DONE', receipt, msg);
}

export async function sendPutawayStartWA(receipt: ReceiptInfo) {
  const msg = buildMessage('PUTAWAY_IN_PROGRESS', receipt);
  return sendViaApi('PUTAWAY_IN_PROGRESS', receipt, msg);
}

export async function sendCompletedWA(
  receipt: ReceiptInfo,
  items: ItemInfo[],
  damages: DamageInfo[]
) {
  const totalGood = items.reduce((s, i) => s + Number(i.actual_good_qty || 0), 0);
  const totalDamage = damages.reduce((s, d) => s + Number(d.qty || 0), 0);
  const totalExpected = items.reduce((s, i) => s + Number(i.expected_qty || 0), 0);

  const msg = (
    `✅ *PROSES INBOUND SELESAI - ${receipt.receipt_number}*\n\n` +
    `Seluruh proses inbound telah selesai.\n\n` +
    `📋 *Ringkasan Final:*\n` +
    `  📦 Target: ${totalExpected} unit\n` +
    `  ✅ Diterima: ${totalGood} unit\n` +
    `  ❌ Rusak: ${totalDamage} unit\n` +
    `  ⏱ Total Bongkar: ${receipt.total_unloading_minutes ?? '?'} menit\n\n` +
    `✅ Status: *COMPLETED*\n\n` +
    `_Terima kasih. Barang sudah tersimpan di gudang._`
  );
  return sendViaApi('COMPLETED', receipt, msg);
}
