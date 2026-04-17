"use client";

import { XCircle, Loader2, Save, Plus } from "lucide-react";
import { formatThousand } from "../utils";

interface AssignFleetModalProps {
    show: boolean;
    onClose: () => void;
    selectedItem: any;
    getRemainingUnits: (item: any) => number;
    formRows: any[];
    setFormRows: (rows: any[]) => void;
    allCompanies: any[];
    allFleets: any[];
    allDrivers: any[];
    busyFleetDates: Map<string, Set<string>>;
    getAvailableFleets: () => any[];
    getAvailableDrivers: () => any[];
    fetchLastVendorPrice: (vId: string, type: string, oD: string, dD: string) => Promise<number>;
    handleAssignUnits: () => void;
    assigning: boolean;
}

export default function AssignFleetModal({
    show, onClose, selectedItem, getRemainingUnits,
    formRows, setFormRows, allCompanies, allFleets, allDrivers,
    busyFleetDates, getAvailableFleets, getAvailableDrivers,
    fetchLastVendorPrice, handleAssignUnits, assigning
}: AssignFleetModalProps) {
    if (!show || !selectedItem) return null;

    const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
    const isInternal = (cid: string | null) => !cid || cid === ownCompanyId;
    const isExternal = (cid: string | null) => !!cid && cid !== ownCompanyId;

    return (
        <div className="fixed inset-0 bg-[#0a0f1e]/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
            <div className="bg-[#151f32] border border-white/10 p-6 md:p-8 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors">
                    <XCircle className="w-7 h-7" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">Assign Armada</h2>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                        {selectedItem.work_orders?.wo_number} • Dibutuhkan {getRemainingUnits(selectedItem)} Unit {selectedItem.truck_type}
                    </p>
                    
                    <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl w-fit flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-xs">Rp</div>
                        <div>
                            <p className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest leading-none mb-1">Harga ke Customer</p>
                            <p className="text-sm text-emerald-400 font-black leading-none">
                                {formatThousand(selectedItem.deal_price || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    {formRows.map((row, i) => {
                        const availableFleets = getAvailableFleets().filter(f => {
                            if (row.type === 'own') return isInternal(f.company_id);
                            if (row.type === 'vendor') {
                                if (row.vendor_id) return f.company_id === row.vendor_id;
                                return isExternal(f.company_id); 
                            }
                            return true;
                        });
                        
                        const availableDrivers = getAvailableDrivers().filter(d => {
                            if (row.type === 'own') return isInternal(d.company_id);
                            if (row.type === 'vendor') {
                                if (row.vendor_id) return d.company_id === row.vendor_id;
                                return isExternal(d.company_id);
                            }
                            return true;
                        });

                        return (
                            <div key={i} className="bg-[#0a0f1e]/50 p-4 md:p-6 rounded-3xl border border-white/5 shadow-inner">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/50">Assignment JO #{i + 1}</p>
                                    
                                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 w-full md:w-auto">
                                        {['own', 'vendor'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => {
                                                    const newRows = [...formRows];
                                                    newRows[i] = { ...newRows[i], type: t as 'own' | 'vendor', fleet_id: '', driver_id: '', vendor_id: '' };
                                                    setFormRows(newRows);
                                                }}
                                                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${row.type === t ? (t === 'own' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20') : 'text-slate-500 hover:text-white'}`}
                                            >
                                                {t === 'own' ? 'Internal' : 'Vendor'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {row.type === 'vendor' && (
                                        <div className="md:col-span-3 pb-3 border-b border-white/5 mb-2">
                                            <label className="block text-[11px] text-slate-500 mb-2 uppercase font-black tracking-widest">Pilih Perusahaan Vendor</label>
                                            <select
                                                value={row.vendor_id || ''}
                                                onChange={e => {
                                                    const newRows = [...formRows];
                                                    newRows[i] = { ...newRows[i], vendor_id: e.target.value, fleet_id: '', driver_id: '' };
                                                    setFormRows(newRows);
                                                }}
                                                className="w-full bg-[#151f32] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                            >
                                                <option value="">-- Semua Vendor --</option>
                                                {allCompanies.filter(c => c.type === 'vendor').map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-2 uppercase font-black tracking-widest">Armada</label>
                                        <select
                                            value={row.fleet_id || ''}
                                            onChange={async (e) => { 
                                                const fid = e.target.value;
                                                const fleet = allFleets.find(f => f.id === fid);
                                                let price = row.vendor_price || 0;
                                                
                                                if (fleet && fleet.company_id && selectedItem.truck_type) {
                                                    const oD = selectedItem.origin_location?.district || "";
                                                    const dD = selectedItem.destination_location?.district || "";
                                                    price = await fetchLastVendorPrice(fleet.company_id || ownCompanyId || "", selectedItem.truck_type, oD, dD);
                                                    if (price === 0 && isInternal(fleet.company_id)) {
                                                        price = (selectedItem.deal_price || 0) * (row.fee_percentage ? row.fee_percentage/100 : 0.1);
                                                    }
                                                }

                                                const newRows = [...formRows]; 
                                                newRows[i] = { ...newRows[i], fleet_id: fid, vendor_price: price }; 
                                                setFormRows(newRows);
                                            }}
                                            className={`w-full bg-[#151f32] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 ${row.type === 'own' ? 'focus:ring-emerald-500/30' : 'focus:ring-blue-500/30'}`}
                                        >
                                            <option value="">-- Pilih Plat --</option>
                                            {(() => {
                                                const reqType = selectedItem.truck_type?.toLowerCase().trim() || "";
                                                const targetDate = selectedItem.work_orders?.execution_date;
                                                const sorted = [...availableFleets].sort((a, b) => {
                                                    const aType = (a.truck_type || "").toLowerCase();
                                                    const bType = (b.truck_type || "").toLowerCase();
                                                    const aMatch = reqType && aType.includes(reqType);
                                                    const bMatch = reqType && bType.includes(reqType);
                                                    
                                                    const aBusyOnDate = targetDate && busyFleetDates.get(a.id)?.has(targetDate);
                                                    const bBusyOnDate = targetDate && busyFleetDates.get(b.id)?.has(targetDate);
                                                    
                                                    if (aMatch && !aBusyOnDate && (!bMatch || bBusyOnDate)) return -1;
                                                    if (bMatch && !bBusyOnDate && (!aMatch || aBusyOnDate)) return 1;
                                                    
                                                    return (a.plate_number || "").localeCompare(b.plate_number || "");
                                                });
                                                
                                                return sorted.map(f => (
                                                    <option key={f.id} value={f.id} disabled={!!(targetDate && busyFleetDates.get(f.id)?.has(targetDate))}>
                                                        {f.plate_number} • {f.truck_type || 'Unknown Type'} {targetDate && busyFleetDates.get(f.id)?.has(targetDate) ? '(BUSY)' : ''}
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-2 uppercase font-black tracking-widest">Driver</label>
                                        <select
                                            value={row.driver_id || ''}
                                            onChange={e => {
                                                const newRows = [...formRows];
                                                newRows[i] = { ...newRows[i], driver_id: e.target.value };
                                                setFormRows(newRows);
                                            }}
                                            className={`w-full bg-[#151f32] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 ${row.type === 'own' ? 'focus:ring-emerald-500/30' : 'focus:ring-blue-500/30'}`}
                                        >
                                            <option value="">-- Pilih Driver --</option>
                                            {availableDrivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-2 uppercase font-black tracking-widest">Tarif / Jalan</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-black">Rp</span>
                                            <input 
                                                type="text"
                                                value={formatThousand(row.vendor_price)}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value.replace(/\D/g, ''));
                                                    const newRows = [...formRows];
                                                    newRows[i] = { ...newRows[i], vendor_price: val };
                                                    setFormRows(newRows);
                                                }}
                                                className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl py-3 pl-9 pr-3 text-xs text-white font-black"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => setFormRows([...formRows, { fleet_id: '', driver_id: '', vendor_price: 0, fee_percentage: 10, type: 'own' }])} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                            <Plus className="w-3.5 h-3.5" /> Baris
                        </button>
                    </div>
                    <button
                        onClick={handleAssignUnits}
                        disabled={assigning}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan Penugasan
                    </button>
                </div>
            </div>
        </div>
    );
}
