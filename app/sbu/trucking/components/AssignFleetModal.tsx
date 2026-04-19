"use client";

import { XCircle, Loader2, Save, Plus, Truck, Users, Banknote, ChevronRight, X, Trash2 } from "lucide-react";
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
    getAvailableFleets: (currentId?: string) => any[];
    getAvailableDrivers: (currentId?: string) => any[];
    fetchLastVendorPrice: (vId: string, type: string, oD: string, dD: string) => Promise<number>;
    handleAssignUnits: (mode: 'draft' | 'handover' | 'finalize') => void;
    assigning: boolean;
    isSingleEdit?: boolean;
}

/**
 * ASSIGN FLEET MODAL: ATLAS ERA
 * Fokus: Putih Bersih, Sectioning Rapi, Atlas Typography.
 */
export default function AssignFleetModal({
    show, onClose, selectedItem, getRemainingUnits,
    formRows, setFormRows, allCompanies, allFleets, allDrivers,
    busyFleetDates, getAvailableFleets, getAvailableDrivers,
    fetchLastVendorPrice, handleAssignUnits, assigning,
    isSingleEdit
}: AssignFleetModalProps) {
    if (!show || !selectedItem) return null;

    const ownCompanyId = allCompanies.find(c => c.type === 'company')?.id;
    const isInternal = (cid: string | null) => !cid || cid === ownCompanyId;
    const isExternal = (cid: string | null) => !!cid && cid !== ownCompanyId;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 lg:p-10">
            <div className="bg-white p-8 md:p-12 rounded-[3rem] w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-[0_30px_100px_rgba(0,0,0,0.15)] relative border border-slate-100 flex flex-col">
                
                {/* Close Button Atlas Style */}
                <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#1E293B] transition-all">
                    <X className="w-6 h-6" />
                </button>

                {/* ATLAS HEADER SECTION */}
                <div className="mb-10 pr-20">
                    <div className="flex items-center gap-3 mb-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Protocol</span>
                         <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                        <div className="flex-1">
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic text-[#1E293B] leading-none mb-2">
                                {isSingleEdit ? 'Unit Strategy Revision' : 'DEPLOYMENT CENTER'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#1E293B]">
                                <p className="text-sm font-black italic uppercase group">
                                    <span className="text-slate-400 not-italic mr-1">WO:</span> {selectedItem.work_orders?.wo_number}
                                </p>
                                <span className="text-slate-200 hidden md:inline">|</span>
                                <p className="text-sm font-black italic uppercase">
                                    <span className="text-slate-400 not-italic mr-1">REQ:</span> {selectedItem.quantity} {selectedItem.truck_type}
                                </p>
                            </div>
                        </div>

                        {!isSingleEdit ? (
                            <div className="bg-orange-600 text-white px-8 py-4 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-orange-500/20 animate-pulse">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Remaining</span>
                                <span className="text-2xl font-black italic leading-none">{getRemainingUnits(selectedItem)} UNITS</span>
                            </div>
                        ) : (
                            <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-emerald-500/20">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Target</span>
                                <span className="text-2xl font-black italic leading-none">SINGLE REVISION</span>
                            </div>
                        )}
                    </div>

                    {/* Customer Info Mini Box */}
                    <div className="mt-6 flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl w-fit">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest leading-none mb-1">Contract Value</p>
                            <p className="text-lg text-[#1E293B] font-black italic tracking-tighter leading-none">
                                {formatThousand(selectedItem.deal_price || 0)} <span className="text-[10px] font-black not-italic text-slate-400 uppercase">/ Unit</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* MISSION ASSIGNMENT LIST */}
                <div className="space-y-6 flex-1 overflow-x-hidden">
                    {formRows.map((row, i) => {
                        let availableFleets = getAvailableFleets(row.fleet_id);
                        let availableDrivers = getAvailableDrivers(row.driver_id);

                        // Enforce Guard: Case-insensitive matching for truck type
                        const matchedFleets = availableFleets.filter(f => 
                            f.truck_type?.trim().toLowerCase() === selectedItem.truck_type?.trim().toLowerCase()
                        );

                        // If no perfect match found, fall back to all available fleets to prevent empty dropdown
                        if (matchedFleets.length > 0) {
                            availableFleets = matchedFleets;
                        }

                        if (row.type === 'own') {
                            availableFleets = availableFleets.filter(f => isInternal(f.company_id));
                            availableDrivers = availableDrivers.filter(d => isInternal(d.company_id));
                        } else if (row.type === 'vendor') {
                            if (row.vendor_id) {
                                availableFleets = availableFleets.filter(f => f.company_id === row.vendor_id);
                                availableDrivers = availableDrivers.filter(d => d.company_id === row.vendor_id);
                            } else {
                                availableFleets = [];
                                availableDrivers = [];
                            }
                        }

                        return (
                            <div key={i} style={{ zIndex: formRows.length - i }} className="relative bg-slate-50/50 p-6 md:p-8 rounded-[2.2rem] border border-slate-100 group hover:border-emerald-500/20 transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#1E293B] font-black text-xs shadow-sm">
                                            {i + 1}
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-[#1E293B] italic">Mission Assignment #{i + 1}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="flex gap-1 p-1 bg-white rounded-2xl border border-slate-200 w-full md:w-auto shadow-sm">
                                            {['own', 'vendor'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => {
                                                        const newRows = [...formRows];
                                                        newRows[i] = { ...newRows[i], type: t as 'own' | 'vendor', fleet_id: '', driver_id: '', vendor_id: '' };
                                                        setFormRows(newRows);
                                                    }}
                                                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${row.type === t ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:text-[#1E293B]'}`}
                                                >
                                                    {t === 'own' ? 'Internal' : 'Outsourced'}
                                                </button>
                                            ))}
                                        </div>
                                        {formRows.length > 1 && (
                                            <button 
                                                onClick={() => {
                                                    const newRows = formRows.filter((_, idx) => idx !== i);
                                                    setFormRows(newRows);
                                                }}
                                                className="w-10 h-10 rounded-2xl bg-white border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {row.type === 'vendor' && (
                                        <div className="md:col-span-3 pb-4 border-b border-slate-100">
                                            <label className="block text-[10px] text-slate-400 mb-2 uppercase font-black tracking-widest ml-1">Vendor Provider</label>
                                            <select
                                                value={row.vendor_id || ''}
                                                onChange={e => {
                                                    const newRows = [...formRows];
                                                    newRows[i] = { ...newRows[i], vendor_id: e.target.value, fleet_id: '', driver_id: '' };
                                                    setFormRows(newRows);
                                                }}
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm"
                                            >
                                                <option value="">-- Select Vendor --</option>
                                                {allCompanies.filter(c => c.type === 'vendor').map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">Fleet Selection</label>
                                        <div className="relative">
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
                                                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm relative z-0"
                                            >
                                                <option value="">-- Choose Plate --</option>
                                                {availableFleets.map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.plate_number} • {f.truck_type}
                                                    </option>
                                                ))}
                                            </select>
                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">Human Resource</label>
                                        
                                        {row.type === 'own' ? (
                                            <div className="relative">
                                                <select
                                                    value={row.driver_id || ''}
                                                    onChange={e => {
                                                        const newRows = [...formRows];
                                                        newRows[i] = { ...newRows[i], driver_id: e.target.value, external_driver_name: '', external_driver_phone: '' };
                                                        setFormRows(newRows);
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm relative z-0"
                                                >
                                                    <option value="">-- Assign Driver --</option>
                                                    {availableDrivers.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {availableDrivers.length > 0 && (
                                                    <div className="relative">
                                                        <select
                                                            value={row.driver_id || ''}
                                                            onChange={e => {
                                                                const newRows = [...formRows];
                                                                newRows[i] = { ...newRows[i], driver_id: e.target.value };
                                                                setFormRows(newRows);
                                                            }}
                                                            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm relative z-0"
                                                        >
                                                            <option value="">-- Pilih Supir Vendor (Bila Teregistrasi) --</option>
                                                            {availableDrivers.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10 pointer-events-none" />
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <input 
                                                        type="text" 
                                                        placeholder={availableDrivers.length > 0 ? "Atau Ketik Manual..." : "Ketik Nama Supir External..."}
                                                        value={row.external_driver_name || ''}
                                                        onChange={e => {
                                                            const newRows = [...formRows];
                                                            newRows[i] = { ...newRows[i], external_driver_name: e.target.value, driver_id: '' };
                                                            setFormRows(newRows);
                                                        }}
                                                        className="w-1/2 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="No. Telp / WA"
                                                        value={row.external_driver_phone || ''}
                                                        onChange={e => {
                                                            const newRows = [...formRows];
                                                            newRows[i] = { ...newRows[i], external_driver_phone: e.target.value, driver_id: '' };
                                                            setFormRows(newRows);
                                                        }}
                                                        className="w-1/2 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-[#1E293B] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">
                                            {row.type === 'own' ? 'Persentase & Uang Jalan Internal' : 'Biaya Sewa / Vendor Rate'}
                                        </label>
                                        <div className="flex gap-2">
                                            {row.type === 'own' && (
                                                <div className="relative w-1/3">
                                                    <input 
                                                        type="number"
                                                        value={row.fee_percentage || ''}
                                                        onChange={(e) => {
                                                            const pct = Number(e.target.value);
                                                            const newRows = [...formRows];
                                                            const dealPrice = selectedItem.deal_price || 0;
                                                            newRows[i] = { 
                                                                ...newRows[i], 
                                                                fee_percentage: pct, 
                                                                vendor_price: (dealPrice * pct) / 100 
                                                            };
                                                            setFormRows(newRows);
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] font-black italic text-emerald-600 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
                                                        placeholder="10"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">%</span>
                                                </div>
                                            )}
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">Rp</span>
                                                <input 
                                                    type="text"
                                                    value={formatThousand(row.vendor_price)}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value.replace(/\D/g, ''));
                                                        const newRows = [...formRows];
                                                        newRows[i] = { ...newRows[i], vendor_price: val };
                                                        setFormRows(newRows);
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-[13px] text-[#1E293B] font-black italic focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ATLAS FINAL ACTIONS */}
                <div className="mt-12 flex flex-col md:flex-row gap-5 items-center justify-between pt-8 border-t border-slate-100">
                    <button 
                        onClick={() => setFormRows([...formRows, { fleet_id: '', driver_id: '', vendor_price: 0, fee_percentage: 10, type: 'own' }])} 
                        className="w-full md:w-auto flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4 text-emerald-600" /> Add Assignment Row
                    </button>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <button
                            onClick={() => handleAssignUnits('draft')}
                            disabled={assigning}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
                        </button>
                        
                        <button
                            onClick={() => handleAssignUnits('handover')}
                            disabled={assigning}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Handover to Admin"}
                        </button>

                        <button
                            onClick={() => handleAssignUnits('finalize')}
                            disabled={assigning}
                            className="bg-[#1E293B] hover:bg-emerald-600 text-white px-10 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Approval"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
