'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Key, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ResetPasswordModal({ isOpen, staff, onClose }: any) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async () => {
    setLoading(true);
    try {
      const generatedPass = Math.random().toString(36).slice(-8);
      
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: staff.user_id,
          newPassword: generatedPass
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to reset password');
      
      setNewPassword(generatedPass);
      toast.success('Password has been reset');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center"><Key size={24}/></div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Security Reset</h2>
                <p className="text-xs font-medium text-slate-500">Regenerating access credentials.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-xl"><X size={20}/></button>
        </div>

        <div className="p-10 space-y-6 text-center">
           {!newPassword ? (
             <>
                <p className="text-sm text-slate-600 leading-relaxed">
                   Are you sure you want to reset the password for <strong>{staff.full_name}</strong>? 
                   A new temporary password will be generated immediately.
                </p>
                <div className="flex flex-col gap-3 pt-4">
                   <Button 
                    className="w-full !py-6 !bg-rose-600 hover:!bg-rose-700" 
                    onClick={handleReset}
                    loading={loading}
                    icon={<Key size={18}/>}
                   >
                     Confirm & Reset Password
                   </Button>
                   <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
             </>
           ) : (
             <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                   <CheckCircle2 size={32}/>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">New Temporary Password</p>
                   <div className="flex items-center justify-between bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 group">
                      <code className="text-2xl font-black text-blue-600 tracking-widest">{newPassword}</code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(newPassword); toast.success('Copied!'); }}
                        className="p-2 text-slate-400 hover:text-slate-900 transition-all"
                      >
                         <Copy size={20}/>
                      </button>
                   </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">Please provide this new password to the user. They should change it after logging in.</p>
                <Button className="w-full !py-6 !bg-slate-900" onClick={onClose}>Done</Button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
