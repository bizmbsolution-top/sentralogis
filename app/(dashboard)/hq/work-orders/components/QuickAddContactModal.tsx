'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { assignRoleAction } from '@/lib/actions/role-mutation-actions';

interface QuickAddContactModalProps {
  onClose: () => void;
  onSuccess: (newContact: any) => void;
}

export default function QuickAddContactModal({ onClose, onSuccess }: QuickAddContactModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !name) return;

    setLoading(true);
    try {
      // [AI] DATA-4E-X4: Entity insert without direct role flag writes.
      // Role flags (is_customer/is_vendor) are now exclusively managed via canonical
      // assignRoleAction per BR10 dual-write pattern. W4 (QuickAddContactModal) was
      // previously the third effective legacy role writer.
      const { data, error } = await supabase
        .from('md_entities')
        .insert({
          tenant_id: profile.tenant_id,
          name: name.toUpperCase(),
          is_active: true
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newEntity = data as { id: string };

      // [AI] DATA-4E-X4: Sync canonical party_roles via server actions for Quick Add.
      // Quick Add grants BOTH CUSTOMER + VENDOR roles (preserves prior behavior).
      const roleTypes: Array<'CUSTOMER' | 'VENDOR'> = ['CUSTOMER', 'VENDOR'];
      for (const canonical of roleTypes) {
        const result = await assignRoleAction(newEntity.id, canonical, 'GLOBAL', null);
        if (!result.ok) {
          throw new Error(`Role sync failed for ${canonical}: ${result.error}`);
        }
      }

      toast.success('Kontak baru berhasil ditambahkan');
      onSuccess(data);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menambah kontak');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in duration-200">
      <Card className="w-full max-w-md p-8 shadow-2xl border-none text-slate-900 !rounded-[2.5rem]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={20} />
             </div>
             <h3 className="text-lg font-black text-slate-900 italic uppercase">Quick Add Contact</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name *</label>
            <input
              autoFocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PT GLOBAL LOGISTIK"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            SAVE CONTACT
          </button>
        </form>
      </Card>
    </div>
  );
}
