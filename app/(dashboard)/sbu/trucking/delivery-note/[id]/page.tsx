"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer, FileText } from "lucide-react";

export default function DeliveryNotePage() {
    const supabase = createClient();
    const params = useParams();
    const [jo, setJo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJo = async () => {
            try {
                const { data, error } = await supabase
                    .from("job_orders")
                    .select(`
                        *,
                        wo_items (*, work_orders (*, customer:md_entities!customer_id (*))),
                        md_fleets (*),
                        md_drivers (*),
                        transporter:md_entities!transporter_id (*)
                    `)
                    .eq("id", params.id)
                    .single();

                if (error) throw error;
                setJo(data);
            } catch (err: any) {
                console.error("Error fetching JO:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (params.id && !(typeof window !== 'undefined' && window.location.search.includes('wait=true'))) {
            fetchJo();
        }
    }, [params.id]);

    const isWaiting = typeof window !== 'undefined' && window.location.search.includes('wait=true');

    if (loading || isWaiting) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white font-sans">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="font-black tracking-widest uppercase text-xs">{isWaiting ? "Menyimpan data terbaru ke database..." : "Memuat Surat Jalan..."}</p>
            </div>
        );
    }

    if (error || !jo) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white p-8 text-center font-sans">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase mb-2">Data Tidak Ditemukan</h1>
                <p className="text-slate-500 text-sm max-w-md">{error || "Job Order tidak ditemukan atau telah dihapus."}</p>
            </div>
        );
    }

    const originStop = jo.wo_items?.item_data?.stops?.find((s: any) => s.stop_type === 'PICKUP' || s.sequence === 1) || jo.wo_items?.item_data?.stops?.[0];
    const destStop = jo.wo_items?.item_data?.stops?.find((s: any) => s.stop_type === 'DROPOFF' || s.sequence > 1) || jo.wo_items?.item_data?.stops?.[1] || originStop;
    const customer = jo.wo_items?.work_orders?.customer;
    const customerName = customer?.company_name || customer?.name || customer?.legal_name || 'Customer';
    const truckType = jo.wo_items?.item_data?.vehicle_type_name || jo.wo_items?.item_data?.vehicle_type || jo.wo_items?.truck_type || 'Armada Trucking';
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${jo.tracking_token || jo.id}` : `https://sentralogis.com/track/${jo.tracking_token || jo.id}`;
    const containerNo = jo.container_number || jo.sbu_metadata?.container_number || '';
    const sealNo = jo.sbu_metadata?.seal_number || '';
    const notes = jo.notes || jo.sbu_metadata?.notes || '';

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center py-6 px-4 print:p-0 print:bg-white font-mono text-slate-800">
            
            {/* Top Toolbar - hidden when printing */}
            <div className="w-full max-w-[210mm] bg-slate-800 text-white px-6 py-3 rounded-t-2xl flex justify-between items-center print:hidden shadow-2xl border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">Surat Jalan — A5 Landscape (Epson LX Dot Matrix)</span>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2 rounded-xl flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                    <Printer className="w-4 h-4" /> CETAK SEKARANG
                </button>
            </div>

            {/* Print Sheet — A5 landscape = 210mm x 148mm */}
            <div id="dn-sheet" className="dn-sheet w-full max-w-[210mm] bg-white print:shadow-none print:max-w-none print:w-[210mm] print:h-[148mm] print:overflow-hidden">
                
                {/* Top border line */}
                <div className="h-[3px] bg-black print:bg-black"></div>

                <div className="px-5 pt-3 pb-2 flex flex-col justify-between print:h-[145mm]">
                    
                    {/* === HEADER === */}
                    <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
                        <div>
                            <h1 className="text-sm font-black tracking-tight uppercase leading-none">PT. SENTRA LOGISTIK INDONESIA</h1>
                            <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">SBU Trucking & Land Transportation</p>
                            <p className="text-[7px] text-gray-500 mt-0.5 leading-tight">
                                Jl. Raya Logistik Nasional No. 88, Jakarta Utara | Telp: (021) 555-0199
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="bg-black text-white px-3 py-1 inline-block mb-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.15em]">SURAT JALAN</h2>
                            </div>
                            <p className="text-xs font-black leading-none">{jo.jo_number}</p>
                            <p className="text-[7px] font-bold text-gray-500 uppercase tracking-wider">WO: {jo.wo_items?.work_orders?.wo_number}</p>
                        </div>
                    </div>

                    {/* === BODY === */}
                    <div className="flex gap-4 flex-1">

                        {/* LEFT: Info Columns */}
                        <div className="flex-1 space-y-2">

                            {/* Row 1: Armada + Tanggal */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">ARMADA / DRIVER</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px]">
                                        <p className="font-black uppercase leading-tight">{jo.md_fleets?.plate_number || 'TBA'}</p>
                                        <p className="font-bold text-gray-600 uppercase">{jo.md_drivers?.name || (jo.transporter ? `Vendor: ${jo.transporter?.name || jo.transporter?.company_name}` : '-')}</p>
                                        <p className="text-gray-500">{jo.driver_phone || jo.md_drivers?.phone || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">TANGGAL / CUSTOMER</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px]">
                                        <p className="font-black uppercase leading-tight">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        <p className="font-bold text-gray-600 uppercase">{customerName}</p>
                                        <p className="text-gray-500 uppercase">{truckType}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Origin + Destination */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">MUAT (ORIGIN)</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px]">
                                        <p className="font-black uppercase leading-tight">{originStop?.location_name || originStop?.contact_name || 'Lokasi Asal'}</p>
                                        <p className="text-gray-500 leading-tight capitalize" style={{ fontSize: '7px' }}>{originStop?.address || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">BONGKAR (DESTINATION)</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px]">
                                        <p className="font-black uppercase leading-tight">{destStop?.location_name || destStop?.contact_name || 'Lokasi Tujuan'}</p>
                                        <p className="text-gray-500 leading-tight capitalize" style={{ fontSize: '7px' }}>{destStop?.address || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Container / Seal / Notes */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">NO. CONTAINER</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px] font-black uppercase min-h-[20px]">
                                        {containerNo || '________________'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">NO. SEAL</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[9px] font-black uppercase min-h-[20px]">
                                        {sealNo || '________________'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-wider mb-0.5">CATATAN</p>
                                    <div className="border border-gray-300 px-2 py-1.5 text-[8px] text-gray-600 min-h-[20px] leading-tight">
                                        {notes || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Deskripsi Muatan Table */}
                            <div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-y border-black">
                                            <th className="py-1 text-[8px] font-black uppercase">Deskripsi Barang</th>
                                            <th className="py-1 text-[8px] font-black uppercase text-center w-24">Jenis</th>
                                            <th className="py-1 text-[8px] font-black uppercase text-right w-16">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-gray-300">
                                            <td className="py-1.5 text-[9px] font-bold uppercase">Angkutan Barang - {customerName}</td>
                                            <td className="py-1.5 text-[9px] font-bold uppercase text-center">{truckType}</td>
                                            <td className="py-1.5 text-[9px] font-black text-right">1 Unit</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RIGHT: QR Code */}
                        <div className="w-[80px] flex flex-col items-center justify-start pt-2 shrink-0">
                            <div className="border border-black p-1">
                                <QRCodeSVG value={trackingUrl} size={68} level="M" />
                            </div>
                            <p className="text-[6px] font-black text-center uppercase tracking-wider mt-1 leading-tight">SCAN<br/>TRACKING</p>
                        </div>
                    </div>

                    {/* === FOOTER: Signatures === */}
                    <div className="border-t border-black pt-2 mt-2">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-wider mb-8">Penerima</p>
                                <div className="border-b border-gray-400 w-3/4 mx-auto mb-0.5"></div>
                                <p className="text-[7px] font-bold text-gray-500 uppercase">Cap & Tanda Tangan</p>
                            </div>
                            <div className="border-x border-gray-200">
                                <p className="text-[8px] font-black uppercase tracking-wider mb-8">Pengemudi</p>
                                <div className="border-b border-gray-400 w-3/4 mx-auto mb-0.5"></div>
                                <p className="text-[8px] font-black uppercase">{jo.md_drivers?.name || 'Driver'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-wider mb-8">Pengirim</p>
                                <div className="border-b border-gray-400 w-3/4 mx-auto mb-0.5"></div>
                                <p className="text-[7px] font-bold text-gray-500 uppercase">Bag. Operasional</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A5 landscape;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm;
                        height: 148mm;
                        margin: 0;
                        padding: 0;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Hide everything except the print sheet */
                    body > * { display: none !important; }
                    body > #__next { display: block !important; }
                    #__next > * { display: none !important; }
                    #__next .dn-sheet { display: block !important; }
                    
                    .dn-sheet {
                        width: 210mm !important;
                        height: 148mm !important;
                        max-width: none !important;
                        overflow: hidden !important;
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                        box-shadow: none !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
                
                /* Screen preview sizing */
                @media screen {
                    .dn-sheet {
                        min-height: 148mm;
                        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    }
                }
            `}</style>
        </div>
    );
}
