"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
    Loader2, Printer, MapPin, Truck, User, 
    Calendar, Hash, FileText, Navigation, 
    Banknote, CheckCircle2, ShieldCheck, TrendingUp
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function WorkOrderReportPage() {
    const supabase = createClient();
    const params = useParams();
    const [wo, setWo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWoData = async () => {
            try {
                // Fetch Work Order Item with JOs and Costs
                const { data, error } = await supabase
                    .from("work_order_items")
                    .select(`
                        *,
                        work_orders!inner (
                            wo_number, order_date, execution_date, notes, status,
                            customers (name, company_name, phone, address)
                        ),
                        origin_location:origin_location_id (name, address, city, district, province),
                        destination_location:destination_location_id (name, address, city, district, province),
                        job_orders (
                            id, jo_number, status, created_at, vendor_price,
                            fleets (plate_number, truck_type),
                            drivers (name, phone),
                            extra_costs (*)
                        )
                    `)
                    .eq("work_order_id", params.id)
                    .single();

                if (error) throw error;
                setWo(data);
            } catch (err: any) {
                console.error("Error fetching report data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchWoData();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="font-black tracking-widest uppercase text-xs">Generating Premium Report...</p>
            </div>
        );
    }

    if (error || !wo) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white p-8 text-center">
                <FileText className="w-16 h-16 text-slate-800 mb-6" />
                <h1 className="text-2xl font-black uppercase mb-2">Report Not Found</h1>
                <p className="text-slate-500 text-sm max-w-md">{error || "Data not found context."}</p>
            </div>
        );
    }

    const totalDealPrice = (wo.deal_price || 0) * (wo.quantity || 1);
    const totalVendorPrice = wo.job_orders.reduce((acc: number, jo: any) => acc + (Number(jo.vendor_price) || 0), 0);
    const totalExtraCosts = wo.job_orders.reduce((acc: number, jo: any) => {
        return acc + (jo.extra_costs || []).reduce((cAcc: number, c: any) => cAcc + (Number(c.amount) || 0), 0);
    }, 0);
    const totalCost = totalVendorPrice + totalExtraCosts;
    const grossProfit = totalDealPrice - totalCost;
    const profitMargin = (grossProfit / (totalDealPrice || 1)) * 100;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-12 flex justify-center items-start print:bg-white print:p-0 font-sans">
            <Toaster position="top-right" />

            {/* Float Action */}
            <div className="fixed bottom-10 right-10 print:hidden z-50 flex gap-4">
                <button 
                    onClick={() => window.print()}
                    className="bg-[#4D148C] hover:bg-[#3d1070] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all"
                >
                    <Printer className="w-6 h-6" />
                    Download PDF / Print
                </button>
            </div>

            {/* Report Document (A4 Portrait) */}
            <div className="w-full max-w-[210mm] bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] p-12 print:shadow-none print:p-8 min-h-[297mm] flex flex-col">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                    <div>
                        <div className="flex items-center gap-1 mb-2">
                           <div className="w-10 h-10 bg-emerald-500 rounded-sm flex items-center justify-center">
                              <Truck className="w-7 h-7 text-white" />
                           </div>
                           <span className="text-4xl font-black italic tracking-tighter text-slate-900">Sentralogis<span className="text-emerald-500">.</span></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Logistics Operational Analysis Report v4.0</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-black uppercase text-slate-900 mb-1">WO Summary</h1>
                        <p className="text-base font-bold text-[#4D148C]">{wo.work_orders?.wo_number}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                    </div>
                </div>

                {/* Core Info Grid */}
                <div className="grid grid-cols-3 gap-8 mb-12">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Client Information</p>
                        <div className="text-sm">
                            <p className="font-black text-slate-900">{wo.work_orders?.customers?.company_name || wo.work_orders?.customers?.name}</p>
                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{wo.work_orders?.customers?.address}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Schedule Details</p>
                        <div className="space-y-2">
                             <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Order Date:</span>
                                <span className="font-bold text-slate-900">{new Date(wo.work_orders?.order_date).toLocaleDateString()}</span>
                             </div>
                             <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Execution:</span>
                                <span className="font-bold text-slate-900">{new Date(wo.work_orders?.execution_date).toLocaleDateString()}</span>
                             </div>
                             <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Status:</span>
                                <span className="font-black text-emerald-600 uppercase italic">{wo.work_orders?.status}</span>
                             </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Route & Asset</p>
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-slate-900 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-emerald-500" /> {wo.origin_location?.name}</p>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5"><Navigation className="w-3 h-3 text-blue-500" /> {wo.destination_location?.name}</p>
                            <p className="bg-slate-100 px-2 py-1 rounded mt-2 inline-block font-black text-[10px] uppercase text-slate-600">Unit: {wo.truck_type}</p>
                        </div>
                    </div>
                </div>

                {/* Financial Summary Cards */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 shadow-sm">Revenue (Billed)</p>
                        <p className="text-xl font-black text-slate-900">IDR {totalDealPrice.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Status: Ready for Invoicing</p>
                    </div>
                    <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Total operational cost</p>
                        <p className="text-xl font-black text-rose-600">IDR {totalCost.toLocaleString()}</p>
                        <p className="text-[10px] text-rose-500 mt-1">Vendor: IDR {totalVendorPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Gross Profit Analysis</p>
                            <p className="text-xl font-black text-emerald-600">IDR {grossProfit.toLocaleString()}</p>
                            <p className={`text-[10px] font-black mt-1 ${profitMargin > 15 ? 'text-emerald-500' : 'text-amber-500'}`}>Margin: {profitMargin.toFixed(1)}%</p>
                        </div>
                        <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-20 h-20 text-emerald-500/10 -rotate-12" />
                    </div>
                </div>

                {/* Job Order Assignments Table */}
                <div className="mb-12">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#4D148C]" /> Assignment Details
                    </p>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">
                                <th className="py-3">Job Order #</th>
                                <th className="py-3">Plate Number</th>
                                <th className="py-3">Driver Name</th>
                                <th className="py-3 text-right">Vendor Price</th>
                                <th className="py-3 text-right">Extra Cost</th>
                                <th className="py-3 text-right">JO Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {wo.job_orders.map((jo: any) => {
                                const joCost = (jo.extra_costs || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
                                return (
                                    <tr key={jo.id} className="border-b border-slate-100">
                                        <td className="py-4 font-black">{jo.jo_number}</td>
                                        <td className="py-4 font-bold uppercase">{jo.fleets?.plate_number}</td>
                                        <td className="py-4">{jo.drivers?.name}</td>
                                        <td className="py-4 text-right font-bold text-slate-600">
                                            {Number(jo.vendor_price || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 text-right font-black text-amber-600">
                                            {joCost > 0 ? joCost.toLocaleString() : '-'}
                                        </td>
                                        <td className="py-4 text-right font-black text-rose-600">
                                            {(Number(jo.vendor_price || 0) + joCost).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Signature / Audit Footer */}
                <div className="mt-auto pt-12 border-t border-slate-200">
                    <div className="flex justify-between items-end">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase">
                                <ShieldCheck className="w-4 h-4" /> System Verified Data
                            </div>
                            <p className="text-[9px] text-slate-400 max-w-[400px]">
                                This report is an official document of SentraLogis. Data is synchronized directly from field operations and real-time tracking systems.
                            </p>
                        </div>
                        <div className="text-right space-y-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operations Manager</p>
                            <div className="w-48 border-b border-slate-900" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { background: white; margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
