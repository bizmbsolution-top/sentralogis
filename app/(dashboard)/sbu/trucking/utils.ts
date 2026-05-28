export const formatThousand = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "";
    const numStr = val.toString();
    if (numStr === "0") return "0";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export function getStatusConfig(opStatus: string) {
    switch(opStatus) {
        case 'finished': return { label: 'DONE', color: 'text-emerald-300', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', stripe: 'bg-emerald-400' };
        case 'on_journey': return { label: 'ON JOURNEY', color: 'text-blue-400', dot: 'bg-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', stripe: 'bg-blue-400' };
        case 'rejected': return { label: 'REJECTED', color: 'text-red-400', dot: 'bg-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', stripe: 'bg-red-500' };
        case 'need_approval': return { label: 'NEED APPROVAL', color: 'text-amber-400', dot: 'bg-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', stripe: 'bg-amber-400' };
        case 'approved': return { label: 'APPROVED', color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', stripe: 'bg-emerald-500' };
        case 'billing_revision': return { label: 'BILLING REVISION', color: 'text-rose-600', dot: 'bg-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', stripe: 'bg-rose-600' };
        default: return { label: 'DRAFT', color: 'text-slate-300', dot: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-500/30', stripe: 'bg-slate-500' };
    }
}

export function getJOStatusBadge(status: string) {
    switch(status) {
        case 'delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
        case 'delivering': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
        case 'picking_up': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
        case 'accepted': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20';
        default: return 'bg-slate-700/60 text-slate-400 border-white/5';
    }
}

export function getOperationalStatus(item: any): string {
    const status = item.work_orders?.status;
    const assignments = item.assignments || [];
    const assignedCount = assignments.length;
    
    const hasRevision = assignments.some((a: any) => a.billing_status === 'rejected');
    if (hasRevision) return 'billing_revision';

    const hasSettledInfo = assignedCount > 0 && assignments.some((a: any) => a.status === 'delivered');
    if (hasSettledInfo) return 'finished';
    
    // Strict definition of On Journey per user request (driver must have clicked accepted)
    const hasActive = assignments.some((a: any) => ['accepted', 'picking_up', 'delivering'].includes(a.status));
    if (hasActive) return 'on_journey';
    
    if (status === 'handover_rejected' || status === 'rejected') return 'rejected';
    if (status === 'handover_pending' || status === 'pending_armada_check') return 'need_approval';
    if (status === 'approved' || (assignedCount > 0 && assignedCount >= item.quantity)) return 'approved';
    return 'draft';
}

// [AI] Indonesian 'terbilang' text converter for currency values
export function terbilang(nominal: number, isRoot: boolean = true): string {
    if (nominal === 0) return isRoot ? "Nol" : "";
    
    const bilang = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";
    
    if (nominal < 12) {
        temp = bilang[nominal];
    } else if (nominal < 20) {
        temp = terbilang(nominal - 10, false) + " Belas";
    } else if (nominal < 100) {
        temp = terbilang(Math.floor(nominal / 10), false) + " Puluh " + terbilang(nominal % 10, false);
    } else if (nominal < 200) {
        temp = "Seratus " + terbilang(nominal - 100, false);
    } else if (nominal < 1000) {
        temp = terbilang(Math.floor(nominal / 100), false) + " Ratus " + terbilang(nominal % 100, false);
    } else if (nominal < 2000) {
        temp = "Seribu " + terbilang(nominal - 1000, false);
    } else if (nominal < 1000000) {
        temp = terbilang(Math.floor(nominal / 1000), false) + " Ribu " + terbilang(nominal % 1000, false);
    } else if (nominal < 1000000000) {
        temp = terbilang(Math.floor(nominal / 1000000), false) + " Juta " + terbilang(nominal % 1000000, false);
    } else if (nominal < 1000000000000) {
        temp = terbilang(Math.floor(nominal / 1000000000), false) + " Milyar " + terbilang(nominal % 1000000000, false);
    }
    
    return temp.replace(/\s+/g, ' ').trim();
}

// [AI] Print cash advance slip (Cetak Slip Kasbon) — formal black & white
export function printCashAdvanceSlip(jo: any, ca?: any) {
    if (!jo) return;

    const joNumber = jo.jo_number || jo.job_orders?.jo_number || "-";

    // Extract WO item data from various structures (assignments page, JODetailDrawer, etc.)
    const woItem = jo.wo_items || jo.wo_item || null;
    const itemData = woItem?.item_data || {};
    const woItemWO = woItem?.wo || woItem?.work_orders || null;

    const executionDateRaw = jo.wo_items?.work_orders?.execution_date || jo.parentWO?.work_orders?.execution_date || jo.work_orders?.execution_date || jo.execution_date || woItemWO?.execution_date || null;
    const executionDate = executionDateRaw ? new Date(executionDateRaw).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : "-";

    const customerFromWo = woItemWO?.customer || {};
    const customerName = customerFromWo?.legal_name || customerFromWo?.name || jo.wo_items?.work_orders?.md_entities?.name || jo.parentWO?.work_orders?.md_entities?.name || jo.work_orders?.md_entities?.name || jo.customer_name || "DIRECT CUSTOMER";

    // Route from stops/locations first, then fallback to individual fields
    const woStops = itemData?.stops || itemData?.locations || [];
    const originName = woStops.length > 0
        ? (woStops[0].location_name || woStops[0].name || woStops[0].city || woStops[0].address || itemData?.origin_name || itemData?.shipper_name || itemData?.shipper_city || jo.origin_name || "-")
        : (itemData?.origin_name || itemData?.shipper_name || itemData?.shipper_city || jo.origin_name || "-");
    const destName = woStops.length > 0
        ? (woStops[woStops.length - 1].location_name || woStops[woStops.length - 1].name || woStops[woStops.length - 1].city || woStops[woStops.length - 1].address || itemData?.destination_name || itemData?.recipient_name || itemData?.recipient_city || jo.destination_name || "-")
        : (itemData?.destination_name || itemData?.recipient_name || itemData?.recipient_city || jo.destination_name || "-");
    const route = `${originName} -> ${destName}`;

    const driverName = jo.driver_name || jo.drivers?.name || jo.md_drivers?.name || jo.md_fleets?.drivers?.name || "-";
    const plateNumber = jo.fleet_number || jo.fleets?.plate_number || jo.md_fleets?.plate_number || "-";
    const truckType = jo.md_fleets?.md_fleet_types?.type_name || jo.md_fleets?.fleet_type?.type_name || jo.md_fleets?.truck_type || jo.fleets?.md_fleet_types?.type_name || "-";

    const amountVal = ca ? Number(ca.amount || 0) : Number(jo.advance_amount || jo.transfer_amount || 0);
    const amountWords = amountVal > 0 ? `${terbilang(amountVal)} Rupiah` : "Nol Rupiah";
    const description = ca?.description || ca?.name || jo.description || "Uang Jalan / Kasbon Operasional";
    const paidBy = ca?.paid_by || jo.paid_by || "SBU Trucking (Operational)";

    const paidAtRaw = ca?.paid_at || ca?.created_at || jo.paid_at || new Date();
    const paidAt = new Date(paidAtRaw).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + " WIB";

    const slipId = ca?.id ? `KAS-${ca.id.toString().substring(0, 8).toUpperCase()}` : `KAS-JO-${joNumber.split('-').pop()}`;

    const itemCode = woItem?.item_code || "-";

    // Bagi hasil (profit sharing) — calculate if driver_payment_amount = 0
    const basePrice = Number(jo.base_price || 0);
    const driverPayout = amountVal;
    const sisaPelunasan = Number(jo.driver_payment_amount || 0); // Jika ada pelunasan tambahan

    // Build WO items rows
    let woItemsHtml = '';
    if (woStops.length > 0) {
        woStops.forEach((stop: any, i: number) => {
            woItemsHtml += `<tr>
                <td style="padding:4px 8px;border:1px solid #000;text-align:center;font-size:9px;">${i + 1}</td>
                <td style="padding:4px 8px;border:1px solid #000;font-size:9px;">${stop.location_name || stop.name || '-'}</td>
                <td style="padding:4px 8px;border:1px solid #000;font-size:9px;">${stop.stop_type === 'PICKUP' || i === 0 ? '✓' : '-'}</td>
                <td style="padding:4px 8px;border:1px solid #000;font-size:9px;">${stop.stop_type === 'DROPOFF' || i === woStops.length - 1 ? '✓' : '-'}</td>
                <td style="padding:4px 8px;border:1px solid #000;font-size:9px;">${stop.address || '-'}</td>
            </tr>`;
        });
    } else {
        woItemsHtml = `<tr>
            <td colspan="5" style="padding:4px 8px;border:1px solid #000;font-size:9px;text-align:center;">${itemCode}</td>
        </tr>`;
    }

    const printWindow = window.open("", "_blank", "width=850,height=600");
    if (!printWindow) {
        alert("Pop-up blocker mencegah pembukaan jendela cetak. Izinkan pop-up untuk aplikasi ini.");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Slip Kasbon - ${slipId}</title><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;font-size:11px;color:#000;background:#fff;padding:20px}
@media print{@page{size:A4 portrait;margin:1cm}body{padding:0}}
.no-print{display:none}
table{width:100%;border-collapse:collapse}
td,th{padding:4px 8px;border:1px solid #000;text-align:left;font-size:9px}
th{background:#000;color:#fff;font-weight:700;text-align:center}
.section-title{font-weight:700;text-transform:uppercase;font-size:9px;border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:6px;margin-top:12px}
.row{display:flex;padding:2px 0;font-size:10px}
.label{width:200px;font-weight:700;text-transform:uppercase;flex-shrink:0}
.value{font-weight:700}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px}
.header-left h2{font-size:13px;text-transform:uppercase;font-weight:700}
.header-left p{font-size:8px;text-transform:uppercase}
.header-right{text-align:right}
.header-right h1{font-size:12px;text-transform:uppercase;font-weight:700}
.header-right p{font-size:8px}
.dashed{border-top:1px dashed #000;margin:12px 0}
.signatures{display:flex;justify-content:space-between;text-align:center;margin-top:20px}
.sig-box{width:30%}
.sig-box p{font-size:8px;text-transform:uppercase;font-weight:700;margin-bottom:4px}
.sig-line{border-bottom:1px solid #000;height:30px;width:80%;margin:0 auto 4px}
.sig-name{font-size:9px;font-weight:700}
.footer{text-align:center;font-size:7px;margin-top:16px;text-transform:uppercase;border-top:1px solid #000;padding-top:8px}
</style></head><body>

<div class="no-print" style="margin-bottom:12px;text-align:right">
    <button onclick="window.close()" style="padding:6px 14px;margin-right:6px;border:1px solid #000;background:#fff;cursor:pointer;font-size:10px">Tutup</button>
    <button onclick="window.print()" style="padding:6px 14px;border:1px solid #000;background:#000;color:#fff;cursor:pointer;font-size:10px">Cetak Slip</button>
</div>

<div style="max-width:750px;margin:0 auto;border:2px solid #000;padding:20px">

<div class="header">
    <div class="header-left">
        <h2>SBU TRUCKING</h2>
        <p>Unified Logistics Network</p>
    </div>
    <div class="header-right">
        <h1>SLIP KASBON JALAN</h1>
        <p>NO: <span style="font-weight:700">${slipId}</span></p>
    </div>
</div>

<div style="display:flex;gap:24px;margin-bottom:12px">
    <div style="flex:1">
        <div class="section-title">Referensi Job Order</div>
        <div class="row"><span class="label">No. JO</span><span class="value">: ${joNumber}</span></div>
        <div class="row"><span class="label">Customer</span><span class="value">: ${customerName}</span></div>
        <div class="row"><span class="label">Rute</span><span class="value">: ${route}</span></div>
        <div class="row"><span class="label">Tgl Kirim</span><span class="value">: ${executionDate}</span></div>
    </div>
    <div style="flex:1">
        <div class="section-title">Driver &amp; Armada</div>
        <div class="row"><span class="label">Pilot / Supir</span><span class="value">: ${driverName}</span></div>
        <div class="row"><span class="label">No. Polisi</span><span class="value">: ${plateNumber}</span></div>
        <div class="row"><span class="label">Tipe Truk</span><span class="value">: ${truckType}</span></div>
        <div class="row"><span class="label">Metode</span><span class="value">: Transfer Bank / Cash</span></div>
    </div>
</div>

<div class="dashed"></div>

<div class="section-title">Work Order Items</div>
<table>
    <tr>
        <th style="width:30px">No</th>
        <th>Lokasi</th>
        <th style="width:50px">Muat</th>
        <th style="width:60px">Bongkar</th>
        <th>Alamat</th>
    </tr>
    ${woItemsHtml}
</table>

<div class="dashed"></div>

<div class="section-title">Rincian Hak Driver</div>
<div class="row"><span class="label">Total Hak Driver</span><span class="value">: Rp ${formatThousand(driverPayout)}</span></div>

<div class="dashed"></div>

<div class="section-title">Rincian Kasbon</div>
<div style="border:2px solid #000;padding:10px;margin:6px 0">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:9px;font-weight:700;text-transform:uppercase">Jumlah Kasbon</span>
        <span style="font-size:14px;font-weight:700">Rp ${formatThousand(amountVal)}</span>
    </div>
    <div style="border-top:1px solid #000;margin-top:6px;padding-top:6px">
        <span style="font-size:8px;text-transform:uppercase;font-weight:700">Terbilang</span>
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;margin-top:2px"># ${amountWords} #</p>
    </div>
</div>
<div class="row"><span class="label">Keperluan</span><span class="value">: ${description}</span></div>
<div class="row"><span class="label">Dibayar Oleh</span><span class="value">: ${paidBy} &bull; ${paidAt}</span></div>

<div class="dashed"></div>

<div class="signatures">
    <div class="sig-box">
        <p>Penerima (Driver)</p>
        <div class="sig-line"></div>
        <div class="sig-name">${driverName}</div>
    </div>
    <div class="sig-box">
        <p>Disetujui (SBU Ops)</p>
        <div class="sig-line"></div>
        <div class="sig-name">OPERATIONAL SBU</div>
    </div>
    <div class="sig-box">
        <p>Dibayarkan (SBU Finance)</p>
        <div class="sig-line"></div>
        <div class="sig-name">FINANCE SBU</div>
    </div>
</div>

<div class="footer">Dokumen ini sah sebagai tanda terima pembayaran kasbon jalan resmi SBU Trucking</div>

</div>
</body></html>`);

    printWindow.document.close();
}
