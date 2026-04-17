"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer, MapPin, Truck, User, Calendar, Hash, FileText, Navigation } from "lucide-react";

export default function DeliveryNotePage() {
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
                        work_orders (
                            wo_number, order_date, notes,
                            customers (name, company_name, phone, address)
                        ),
                        work_order_items (
                            truck_type, quantity,
                            origin_location:origin_location_id (name, address, city),
                            destination_location:destination_location_id (name, address, city)
                        ),
                        fleets (plate_number),
                        drivers (name, phone)
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

        if (params.id) fetchJo();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white font-sans">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="font-black tracking-widest uppercase text-xs">Memuat Surat Jalan...</p>
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

    const trackingUrl = `${window.location.origin}/jo/${jo.driver_link_token}`;

    return (
        <div className="min-h-screen bg-slate-100 p-0 sm:p-8 flex justify-center items-start print:bg-white print:p-0 font-sans">
            {/* Action Bar (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden z-50">
                <button 
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all active:scale-95"
                >
                    <Printer className="w-6 h-6" />
                    Cetak Surat Jalan
                </button>
            </div>

            {/* Delivery Note Container (A5 Landscape approx scaled for view) */}
            <div className="w-full max-w-[210mm] bg-white shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
                <div className="p-8 border-[6px] border-slate-900 border-double m-2 min-h-[148.5mm] flex flex-col relative text-slate-900">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 mb-1">SENTRALOGIS</h1>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Trucking & Supply Chain Solution</p>
                            <p className="text-[8px] text-slate-500 mt-1 max-w-[300px]">Surat Jalan Sah sebagai bukti pengiriman barang. Segala kehilangan atau kerusakan diluar tanggung jawab kami setelah ditandatangani.</p>
                        </div>
                        <div className="text-right">
                            <div className="bg-slate-900 text-white px-4 py-2 inline-block mb-3">
                                <h2 className="text-sm font-black uppercase tracking-widest">SURAT JALAN</h2>
                            </div>
                            <p className="text-base font-black text-slate-900">{jo.jo_number}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order: {jo.work_orders?.wo_number}</p>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-12 gap-8 flex-1 items-start">
                        
                        {/* Shipment Info */}
                        <div className="col-span-8 space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic flex items-center gap-1.5">
                                        <Hash className="w-2.5 h-2.5" /> Armada & Driver
                                    </p>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">{jo.fleets?.plate_number}</p>
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{jo.drivers?.name}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic flex items-center gap-1.5">
                                        <Calendar className="w-2.5 h-2.5" /> Tanggal Cetak
                                    </p>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-900 uppercase">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic flex items-center gap-1.5">
                                        <MapPin className="w-2.5 h-2.5" /> Lokasi Muat (Origin)
                                    </p>
                                    <div className="p-1">
                                        <p className="text-[11px] font-black text-slate-900 uppercase italic leading-tight mb-1">{jo.work_order_items?.origin_location?.name}</p>
                                        <p className="text-[9px] text-slate-500 leading-relaxed capitalize">{jo.work_order_items?.origin_location?.address}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic flex items-center gap-1.5">
                                        <Navigation className="w-2.5 h-2.5" /> Lokasi Bongkar (Destination)
                                    </p>
                                    <div className="p-1">
                                        <p className="text-[11px] font-black text-slate-900 uppercase italic leading-tight mb-1">{jo.work_order_items?.destination_location?.name}</p>
                                        <p className="text-[9px] text-slate-500 leading-relaxed capitalize">{jo.work_order_items?.destination_location?.address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic flex items-center gap-1.5">
                                    <Truck className="w-2.5 h-2.5" /> Deskripsi Muatan
                                </p>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-900">
                                            <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-900">Deskripsi Barang</th>
                                            <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Unit</th>
                                            <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-3">
                                                <p className="text-xs font-black uppercase text-slate-800 italic">Angkutan Barang via {jo.work_order_items?.truck_type}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{jo.work_orders?.customers?.company_name || jo.work_orders?.customers?.name}</p>
                                            </td>
                                            <td className="py-3 text-xs font-black text-slate-900 text-center">{jo.work_order_items?.truck_type}</td>
                                            <td className="py-3 text-xs font-black text-slate-900 text-right">1 Unit</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tracking QR */}
                        <div className="col-span-4 flex flex-col items-center justify-center border-l border-slate-100 pl-8">
                            <div className="bg-white p-2 border-2 border-slate-900 rounded-2xl mb-4 shadow-xl shadow-slate-200">
                                <QRCodeSVG value={trackingUrl} size={140} level="H" />
                            </div>
                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] mb-1">SCAN UNTUK POD</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center px-4 leading-relaxed italic">Gunakan kamera ponsel untuk update status pengiriman driver link</p>
                        </div>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t-2 border-slate-900">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-16">Penerima (Receiver)</p>
                            <div className="border-b border-slate-400 w-full mb-1 mx-auto max-w-[150px]"></div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Cap & Tanda Tangan</p>
                        </div>
                        <div className="text-center border-x border-slate-100 relative">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-16">Pengemudi (Driver)</p>
                            <div className="border-b border-slate-400 w-full mb-1 mx-auto max-w-[150px]"></div>
                            <p className="text-xs font-black text-slate-900 uppercase italic">{jo.drivers?.name}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-16">Pengirim (Dispatcher)</p>
                            <div className="border-b border-slate-400 w-full mb-1 mx-auto max-w-[150px]"></div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Bagian Operasional</p>
                        </div>
                    </div>

                    {/* Branding Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03]">
                        <h2 className="text-[120px] font-black lowercase tracking-tighter text-slate-900">sentralogis</h2>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A5 landscape;
                        margin: 0;
                    }
                    body {
                        background: white;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}
