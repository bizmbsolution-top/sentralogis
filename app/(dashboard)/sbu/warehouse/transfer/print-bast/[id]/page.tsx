'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrintBASTPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [shipment, setShipment] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchBAST = async () => {
      const { data: shipData } = await supabase
        .from('wh_transfer_orders')
        .select(`
          *,
          from_warehouse:from_warehouse_id(code, name),
          to_warehouse:to_warehouse_id(code, name)
        `)
        .eq('id', params.id)
        .single();

      if (!shipData) return;

      let outTransporter: any, outFleet: any, outDriver: any, outCustomer: any;

      const { data: outShipData } = await supabase
        .from('wh_outbound_shipments')
        .select(`
          id, wo_item_id,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp),
          customer:customer_id(name, legal_name)
        `)
        .eq('transfer_id', params.id)
        .maybeSingle();

      outTransporter = (outShipData as any)?.transporter;
      outFleet = (outShipData as any)?.fleet;
      outDriver = (outShipData as any)?.driver;
      outCustomer = (outShipData as any)?.customer;

      if (shipData.transporter_id) {
        const { data: t } = await supabase.from('md_entities').select('name').eq('id', shipData.transporter_id).maybeSingle();
        if (t) shipData.transporter = { name: t.name };
      }
      if (shipData.fleet_id) {
        const { data: f } = await supabase.from('md_fleets').select('plate_number').eq('id', shipData.fleet_id).maybeSingle();
        if (f) shipData.fleet = { plate_number: f.plate_number };
      }
      if (shipData.driver_id) {
        const { data: d } = await supabase.from('md_drivers').select('name, whatsapp').eq('id', shipData.driver_id).maybeSingle();
        if (d) shipData.driver = d;
      }
      if (shipData.customer_id) {
        const { data: c } = await supabase.from('md_entities').select('name, legal_name').eq('id', shipData.customer_id).maybeSingle();
        if (c) shipData.customer = c;
      }

      if (!shipData.transporter && outTransporter) shipData.transporter = outTransporter;
      if (!shipData.fleet && outFleet) shipData.fleet = outFleet;
      if (!shipData.driver && outDriver) shipData.driver = outDriver;
      if (!shipData.customer && outCustomer) shipData.customer = outCustomer;

      const outWoItemId = (outShipData as any)?.wo_item_id || shipData.wo_item_id;
      const woItemId = shipData.wo_item_id || outWoItemId;

      // [AI] Fallback: get customer from work_order chain
      if (!shipData.customer && woItemId) {
        const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', woItemId).single();
        if (woItemData?.wo_id) {
          const { data: woData } = await supabase.from('work_orders').select('customer_id').eq('id', woItemData.wo_id).single();
          if (woData?.customer_id) {
            const { data: custData } = await supabase.from('md_entities').select('name, legal_name').eq('id', woData.customer_id).single();
            if (custData) shipData.customer = custData;
          }
        }
      }

      if (woItemId) {
        const { data: joData } = await supabase.from('job_orders').select('jo_number').eq('wo_item_id', woItemId).maybeSingle();
        if (joData) shipData.jo_number = joData.jo_number;
      }

      if (shipData?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, address')
          .eq('id', shipData.tenant_id)
          .maybeSingle();
        if (tenantData) {
          shipData.tenant_name = tenantData.name;
          shipData.tenant_address = tenantData.address;
        }
      }

      setShipment(shipData);

      const { data: itemsData } = await supabase
        .from('wh_transfer_details')
        .select(`*, product:product_sku_id(name, sku_code, unit)`)
        .eq('transfer_id', params.id);

      if (itemsData && itemsData.length > 0) {
        setItems(itemsData);
      } else if ((outShipData as any)?.id) {
        const { data: outItems } = await supabase
          .from('wh_outbound_shipment_items')
          .select(`*, product:product_sku_id(name, sku_code, unit)`)
          .eq('shipment_id', (outShipData as any).id);
        if (outItems) setItems(outItems);
      }
    };
    if (params?.id) fetchBAST();
  }, [params?.id]);

  if (!shipment) return <div className="p-10 text-center animate-pulse text-sm">Memuat dokumen...</div>;

  const docNumber = shipment.transfer_number || shipment.jo_number || '-';
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const customerName = shipment.customer?.legal_name || shipment.customer?.name || '-';

  return (
    <div className="min-h-screen bg-slate-200 py-10 print:py-0 print:bg-white flex flex-col items-center bast-print">

      {/* Non-printable Controls */}
      <div className="w-full max-w-[148mm] flex justify-between items-center mb-6 print:hidden px-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm font-bold hover:bg-slate-50 transition active:scale-95 text-sm">
          <ArrowLeft size={16} /> Kembali
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20 font-bold hover:bg-blue-700 transition active:scale-95 text-sm">
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* Half A4 Paper Container (A5) */}
      <div className="bg-white shadow-2xl w-full max-w-[148mm] min-h-[210mm] p-5 print:shadow-none print:m-0 relative text-slate-900 text-[10px] leading-relaxed">

        {/* Kop Surat */}
        <div className="border-b border-slate-900 pb-3 mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">{shipment.tenant_name}</h1>
            {shipment.tenant_address && <p className="text-[10px] text-slate-600 mt-0.5">{shipment.tenant_address}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-800 uppercase">Berita Acara</h2>
            <p className="text-[10px] font-semibold text-slate-600 mt-0.5">Serah Terima Barang</p>
          </div>
        </div>

        {/* Nomor Dokumen */}
        <div className="text-center mb-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">No. {docNumber}</p>
        </div>

        {/* Pembukaan */}
        <p className="mb-4 text-justify">
          Pada hari ini, {today}, telah dilakukan serah terima barang antar gudang dengan rincian sebagai berikut:
        </p>

        {/* Info Table */}
        <table className="w-full text-[10px] mb-4">
          <tbody>
            <tr>
              <td className="w-28 py-1 font-semibold text-slate-700 align-top">Jenis</td>
              <td className="w-3 py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">TRANSFER GUDANG</td>
              <td className="w-24 py-1 font-semibold text-slate-700 align-top pl-4">Tanggal</td>
              <td className="w-3 py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{new Date(shipment.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-slate-700 align-top">Gudang Asal</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{shipment.from_warehouse?.code || '-'} — {shipment.from_warehouse?.name || '-'}</td>
              <td className="py-1 font-semibold text-slate-700 align-top pl-4">Gudang Tujuan</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{shipment.to_warehouse?.code || '-'} — {shipment.to_warehouse?.name || '-'}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-slate-700 align-top">Pelanggan</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{customerName}</td>
              <td className="py-1 font-semibold text-slate-700 align-top pl-4">JO</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{shipment.jo_number || '-'}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-slate-700 align-top">Transporter</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{shipment.transporter?.name || '-'}</td>
              <td className="py-1 font-semibold text-slate-700 align-top pl-4">Kendaraan</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top">{shipment.fleet?.plate_number || '-'}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold text-slate-700 align-top">Driver</td>
              <td className="py-1 align-top">:</td>
              <td className="py-1 font-bold align-top" colSpan={3}>{shipment.driver?.name || '-'}</td>
            </tr>
            {shipment.notes && (
              <tr>
                <td className="py-1 font-semibold text-slate-700 align-top">Catatan</td>
                <td className="py-1 align-top">:</td>
                <td className="py-1 italic text-slate-600" colSpan={3}>{shipment.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Item Table */}
        <h3 className="font-bold text-slate-800 text-[10px] mb-2 border-b border-slate-300 pb-1 uppercase tracking-wider">Rincian Barang</h3>
        <table className="w-full text-[10px] border-collapse mb-5">
          <thead>
            <tr className="border border-slate-400">
              <th className="border border-slate-400 px-2 py-1.5 text-left w-6 font-semibold">No</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-semibold">SKU</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-semibold">Nama Produk</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center w-20 font-semibold">Qty</th>
              <th className="border border-slate-400 px-2 py-1.5 text-center w-14 font-semibold">Satuan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="border border-slate-400 px-2 py-4 text-center italic text-slate-500">Tidak ada item.</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} className="border border-slate-400">
                  <td className="border border-slate-400 px-2 py-1.5 text-center">{idx + 1}</td>
                  <td className="border border-slate-400 px-2 py-1.5 font-mono">{item.product?.sku_code || '-'}</td>
                  <td className="border border-slate-400 px-2 py-1.5">{item.product?.name || '-'}</td>
                  <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">{Number(item.requested_qty || item.quantity || 0).toLocaleString()}</td>
                  <td className="border border-slate-400 px-2 py-1.5 text-center">{item.product?.unit || 'PCS'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Penutup */}
        <p className="text-[10px] text-justify mb-6 leading-relaxed">
          Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya. Barang-barang tersebut di atas telah diperiksa dan dinyatakan dalam keadaan baik dan lengkap.
        </p>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end px-4 mb-8">
          <div className="text-center w-36">
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-16">Pihak Pertama<br/>(Gudang Asal)</p>
            <div className="border-b border-slate-900 w-full mb-1"></div>
            <p className="text-[9px] font-bold">{shipment.tenant_name || 'Admin Warehouse'}</p>
          </div>
          <div className="text-center w-36">
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-16">Pihak Kedua<br/>(Transporter)</p>
            <div className="border-b border-slate-900 w-full mb-1"></div>
            <p className="text-[9px] font-bold">{shipment.driver?.name || 'Driver / Supir'}</p>
          </div>
          <div className="text-center w-36">
            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-16">Pihak Ketiga<br/>(Gudang Tujuan)</p>
            <div className="border-b border-slate-900 w-full mb-1"></div>
            <p className="text-[9px] font-bold">{shipment.to_warehouse?.code || 'Admin Warehouse'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[8px] text-slate-400 border-t border-slate-300 pt-2 flex justify-between">
          <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
          <span>Dokumen No. {docNumber}</span>
          <span>{shipment.tenant_name || ''}</span>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden !important; }
          .bast-print, .bast-print * { visibility: visible !important; }
          .bast-print { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 0; size: A5; }
        }
      `}} />
    </div>
  );
}
