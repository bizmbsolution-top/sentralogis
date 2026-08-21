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
      const { data: rawShipData } = await (supabase
        .from('wh_outbound_shipments' as any) as any)
        .select(`
          *,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp),
          customer:customer_id(name, legal_name),
          consignee:consignee_id(name, legal_name),
          warehouse:warehouse_id(name, address),
          wo_item:wo_item_id(work_orders(wo_number), job_orders(jo_number))
        `)
        .eq('id', params.id)
        .single();
        
      const shipData: any = rawShipData;
      if (shipData?.tenant_id) {
        const { data: tenantData } = await (supabase
          .from('tenants' as any) as any)
          .select('name')
          .eq('id', shipData.tenant_id)
          .single();
        shipData.tenant_name = tenantData?.name;
      }

      setShipment(shipData);

      if (shipData) {
        const { data: itemsData } = await supabase
          .from('wh_outbound_shipment_items')
          .select(`*, product:product_sku_id(name, sku_code, unit)`)
          .eq('shipment_id', params.id);
          
        setItems(itemsData || []);
      }
    };
    if (params?.id) fetchBAST();
  }, [params?.id]);

  if (!shipment) return <div className="p-10 text-center animate-pulse">Memuat dokumen Berita Acara...</div>;

  // Sesuai request: Tampilkan qty expected dari JO, jadi tampilkan semua item
  const validItems = items;

  return (
    <div className="min-h-screen bg-slate-200 py-10 print:py-0 print:bg-white flex flex-col items-center">
      
      {/* Non-printable Controls */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 print:hidden px-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl shadow-sm font-bold hover:bg-slate-50 transition active:scale-95">
          <ArrowLeft size={16} /> Kembali
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20 font-bold hover:bg-blue-700 transition active:scale-95">
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-12 print:shadow-none print:m-0 relative">
        
        {/* Header / Kop Surat */}
        <div className="border-b-[3px] border-slate-900 pb-5 mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{shipment.tenant_name || 'PT. BIZMB SOLUTION'}</h1>
            <p className="text-sm text-slate-600 font-bold mt-1 uppercase tracking-widest">Sistem Manajemen Logistik Terpadu</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800">BERITA ACARA SERAH TERIMA</h2>
            <p className="text-xs font-bold text-slate-500 mt-1 tracking-widest">DOKUMEN PENGIRIMAN</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-10">
          <p className="text-sm text-slate-700 leading-relaxed mb-5">
            Pada hari ini, telah dilakukan serah terima barang dari pihak Gudang kepada pihak Ekspedisi/Transporter untuk dikirimkan kepada pelanggan, dengan rincian sebagai berikut:
          </p>
          
          <table className="text-sm w-full">
            <tbody>
              <tr>
                <td className="w-32 py-2 font-semibold text-slate-600">Layanan</td>
                <td className="w-4 py-2">:</td>
                <td className="py-2 font-bold text-slate-900">OUTBOUND</td>
                
                <td className="w-32 py-2 font-semibold text-slate-600">Tanggal</td>
                <td className="w-4 py-2">:</td>
                <td className="py-2 font-bold text-slate-900">{new Date(shipment.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-slate-600">Pelanggan</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">{shipment.customer?.legal_name || shipment.customer?.name || shipment.customer_name || '-'}</td>
                
                <td className="py-2 font-semibold text-slate-600">WO:</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">{shipment.wo_item?.work_orders?.wo_number || '-'}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-slate-600">Consignee</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">{shipment.consignee?.legal_name || shipment.consignee?.name || '-'}</td>
                
                <td className="py-2 font-semibold text-slate-600">Transporter</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">{shipment.transporter?.name || shipment.transporter_name_manual || '-'}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-slate-600">Lokasi Gudang</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">
                  {shipment.warehouse?.name || '-'} <span className="font-normal text-slate-600 block mt-0.5">{shipment.warehouse?.address || ''}</span>
                </td>
                
                <td className="py-2 font-semibold text-slate-600">Driver & Kendaraan</td>
                <td className="py-2">:</td>
                <td className="py-2 font-bold text-slate-900">
                  {shipment.driver?.name || '-'} <span className="text-slate-500 font-normal">({shipment.fleet?.plate_number || '-'})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Item Table */}
        <h3 className="font-bold text-slate-800 text-sm mb-3 border-l-4 border-slate-900 pl-2">Rincian Barang</h3>
        <table className="w-full text-sm border-collapse mb-10">
          <thead>
            <tr className="bg-slate-100 border border-slate-300">
              <th className="border border-slate-300 px-4 py-3 text-left w-12 font-semibold text-slate-700">No</th>
              <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Kode / SKU</th>
              <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-700">Deskripsi Produk</th>
              <th className="border border-slate-300 px-4 py-3 text-center w-32 font-semibold text-slate-700">Kuantitas</th>
            </tr>
          </thead>
          <tbody>
            {validItems.length === 0 ? (
              <tr><td colSpan={4} className="border border-slate-300 px-4 py-8 text-center italic text-slate-500">Tidak ada item.</td></tr>
            ) : (
              validItems.map((item, idx) => (
                <tr key={item.id} className="even:bg-slate-50/50">
                  <td className="border border-slate-300 px-4 py-3 text-center text-slate-800">{idx + 1}</td>
                  <td className="border border-slate-300 px-4 py-3 text-slate-800">{item.product?.sku_code}</td>
                  <td className="border border-slate-300 px-4 py-3 text-slate-800">{item.product?.name}</td>
                  <td className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">{item.requested_qty} PCS</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Statement */}
        <div className="text-sm text-slate-700 leading-relaxed mb-20 text-justify">
          Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya. Barang yang tercantum di atas telah diverifikasi kesesuaiannya dan diserahkan dalam keadaan baik. Tanggung jawab pengiriman barang selanjutnya sepenuhnya berada pada pihak Transporter/Ekspedisi.
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end px-12">
          <div className="text-center w-48">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-24">Pihak Pertama (Gudang)</p>
            <div className="border-b-2 border-slate-900 w-full mb-2"></div>
            <p className="text-sm font-black text-slate-800">Admin Warehouse</p>
          </div>
          
          <div className="text-center w-48">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-24">Pihak Kedua (Transporter)</p>
            <div className="border-b-2 border-slate-900 w-full mb-2"></div>
            <p className="text-sm font-black text-slate-800">{shipment.driver?.name || 'Supir / Driver'}</p>
          </div>
        </div>

        {/* Footer info print */}
        <div className="absolute bottom-10 left-12 right-12 flex justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-4">
           <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
           <span>Dokumen Internal {shipment.tenant_name || 'PT. BIZMB SOLUTION'}</span>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          @page { margin: 0; size: A4; }
        }
      `}} />
    </div>
  );
}
