'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Shield, RefreshCcw, Power, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function EditStaffModal({ isOpen, staff, onClose, onSuccess, sbus }: any) {
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(staff.is_active);
  const [fullName, setFullName] = useState(staff.full_name);
  const [roleCode, setRoleCode] = useState(staff.role_code);
  const [sbuId, setSbuId] = useState(staff.sbu_id || '');

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ 
          full_name: fullName,
          role_code: roleCode,
          sbu_id: sbuId || null,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', staff.id);

      if (error) throw error;
      
      // Also update profile full_name for consistency
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', staff.user_id);

      toast.success('Staff updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserCircle size={24}/></div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Edit Staff Profile</h2>
                <p className="text-xs font-medium text-slate-500">Updating node parameters and permissions.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleUpdate} className="p-10 space-y-6">
           <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Identifier</p>
                    <p className="text-sm font-bold text-slate-900 italic">{staff.profiles?.email}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                       {isActive ? 'Authorized' : 'Restricted'}
                    </span>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                 <input 
                   type="text" 
                   value={fullName}
                   onChange={e => setFullName(e.target.value)}
                   className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                   required
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Allocation</label>
                    <select 
                      value={sbuId}
                      onChange={e => setSbuId(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                    >
                       <option value="">Central HQ</option>
                       {sbus?.map((s: any) => (
                         <option key={s.id} value={s.id}>{s.sbu_name}</option>
                       ))}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Position Code</label>
                    <input 
                      type="text" 
                      value={roleCode}
                      onChange={e => setRoleCode(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500/10"
                      required
                    />
                 </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all mt-4 ${
                  isActive ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'
                }`}
              >
                <div className="flex items-center gap-3">
                   <Power className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-rose-600'}`} />
                   <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isActive ? 'Access: Authorized' : 'Access: Restricted'}
                   </span>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
           </div>

           <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button 
                type="submit" 
                className="flex-[2] !py-6 !bg-slate-900" 
                loading={loading}
                icon={<RefreshCcw size={18}/>}
              >
                Commit Changes
              </Button>
           </div>
        </form>
      </div>
    </div>
  );
}
