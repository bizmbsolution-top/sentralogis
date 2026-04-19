"use client";

import React, { useState } from "react";
import { X, Zap, CheckCircle2, Loader2, ShieldCheck, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface SBUActivationModalProps {
  show: boolean;
  onClose: () => void;
  sbu: any;
  companyId: string;
  currentActiveSbus: string[];
  onSuccess: (newSbus: string[]) => void;
}

const SBUActivationModal: React.FC<SBUActivationModalProps> = ({ 
  show, onClose, sbu, companyId, currentActiveSbus, onSuccess 
}) => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  if (!show || !sbu) return null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const newSbus = [...currentActiveSbus, sbu.id];
      const { error } = await supabase
        .from('companies')
        .update({ active_sbus: newSbus })
        .eq('id', companyId);

      if (error) throw error;

      toast.success(`${sbu.title} Activated Successfully!`);
      onSuccess(newSbus);
      onClose();
    } catch (error: any) {
      toast.error("Activation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 pb-20 md:pb-6">
      <div className="absolute inset-0 bg-[#0a0f1e]/60 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className={`p-10 ${sbu.bg} flex flex-col items-center text-center space-y-6 relative overflow-hidden`}>
            {/* Background Decorator */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/20 rounded-full blur-3xl" />
            
            <div className={`w-24 h-24 rounded-[2.5rem] bg-white flex items-center justify-center ${sbu.color || 'text-[#1E293B]'} shadow-xl transform -rotate-3 transition-transform hover:rotate-0`}>
                <sbu.icon className="w-12 h-12" />
            </div>
            
            <div className="space-y-2 relative z-10">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-[#1E293B] leading-none">{sbu.title}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{sbu.desc}</p>
            </div>
            
            <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 hover:bg-white hover:text-red-500 transition-all shadow-sm">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-10 space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-emerald-500/20 transition-all">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div className="text-left flex-1">
                        <p className="text-[11px] font-black text-[#1E293B] uppercase tracking-tighter">Enterprise Compliance</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Automated tax filing & global regulatory standards</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-500/20 transition-all">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <Zap className="w-7 h-7" />
                    </div>
                    <div className="text-left flex-1">
                        <p className="text-[11px] font-black text-[#1E293B] uppercase tracking-tighter">Real-time Synergy</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Instant data synchronization across SBU borders</p>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Provisioning Fee</p>
                        <p className="text-2xl font-black italic text-emerald-600">IDR 0<span className="text-[10px] text-slate-400 font-bold not-italic ml-2 uppercase tracking-widest opacity-60">/ Limited Beta</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">SLA Guarantee</p>
                        <p className="text-sm font-black italic text-[#1E293B] uppercase tracking-tighter mt-1">99.9% Uptime</p>
                    </div>
                 </div>

                 <button 
                    onClick={handleActivate}
                    disabled={loading}
                    className="w-full py-6 bg-[#1E293B] hover:bg-orange-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98] disabled:bg-slate-200"
                 >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Initializing System Matrix...
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5 fill-white" />
                            Execute Module Activation
                        </>
                    )}
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SBUActivationModal;
