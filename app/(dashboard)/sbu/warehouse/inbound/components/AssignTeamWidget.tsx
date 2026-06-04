'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AssignTeamWidgetProps {
  receiptId: string;
  joId?: string;
  tenantId: string;
  warehouseId?: string;
}

export default function AssignTeamWidget({ receiptId, joId, tenantId, warehouseId }: AssignTeamWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // Selection state
  const [selectedSecurity, setSelectedSecurity] = useState('');
  const [selectedTally, setSelectedTally] = useState('');
  const [selectedPutaway, setSelectedPutaway] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch available staff
        let query = supabase.from('md_warehouse_staff').select('*').eq('tenant_id', tenantId).eq('is_active', true);
        if (warehouseId) {
          query = query.or(`warehouse_id.eq.${warehouseId},warehouse_id.is.null`);
        }
        const { data: staffData } = await query;
        setStaff(staffData || []);

        // 2. Fetch existing assignments
        const { data: assignData } = await supabase
          .from('wh_jo_staff_assignments')
          .select('*')
          .eq('receipt_id', receiptId);
          
        setAssignments(assignData || []);

        // Pre-fill selection
        if (assignData) {
          const sec = assignData.find(a => a.assigned_role === 'SECURITY');
          const tally = assignData.find(a => a.assigned_role === 'TALLY');
          const putaway = assignData.find(a => a.assigned_role === 'PUTAWAY');
          
          if (sec) setSelectedSecurity(sec.staff_id);
          if (tally) setSelectedTally(tally.staff_id);
          if (putaway) setSelectedPutaway(putaway.staff_id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    if (tenantId && receiptId) fetchData();
  }, [tenantId, receiptId, warehouseId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // For simplicity, we just delete existing assignments for this receipt and insert new ones
      await supabase.from('wh_jo_staff_assignments').delete().eq('receipt_id', receiptId);

      const inserts = [];
      // Note: A real implementation might require a joId to be present if it's tied to job_orders.
      // But we can assign to receipt_id and set jo_id to a dummy or the actual if passed.
      const resolvedJoId = joId || receiptId; // fallback if jo_id is required by schema

      if (selectedSecurity) {
        inserts.push({ tenant_id: tenantId, receipt_id: receiptId, jo_id: resolvedJoId, staff_id: selectedSecurity, assigned_role: 'SECURITY' });
      }
      if (selectedTally) {
        inserts.push({ tenant_id: tenantId, receipt_id: receiptId, jo_id: resolvedJoId, staff_id: selectedTally, assigned_role: 'TALLY' });
      }
      if (selectedPutaway) {
        inserts.push({ tenant_id: tenantId, receipt_id: receiptId, jo_id: resolvedJoId, staff_id: selectedPutaway, assigned_role: 'PUTAWAY' });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('wh_jo_staff_assignments').insert(inserts);
        if (error) throw error;
      }
      
      toast.success('Tim berhasil ditugaskan ke PWA mereka');
    } catch (err: any) {
      toast.error('Gagal menugaskan tim: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
  }

  const securityStaff = staff.filter(s => s.role === 'SECURITY');
  const tallyStaff = staff.filter(s => s.role === 'TALLY');
  const putawayStaff = staff.filter(s => s.role === 'PUTAWAY');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users size={16} className="text-slate-500" /> PWA Team Assignment
        </h3>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 hover:bg-slate-800 transition-colors"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Push Job
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Gate Security</label>
          <select value={selectedSecurity} onChange={e => setSelectedSecurity(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 outline-none text-slate-900 bg-slate-50">
            <option value="">-- Select Security --</option>
            {securityStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.whatsapp})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Tally Checker</label>
          <select value={selectedTally} onChange={e => setSelectedTally(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 outline-none text-slate-900 bg-slate-50">
            <option value="">-- Select Tally --</option>
            {tallyStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.whatsapp})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Putaway / Forklift</label>
          <select value={selectedPutaway} onChange={e => setSelectedPutaway(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 outline-none text-slate-900 bg-slate-50">
            <option value="">-- Select Putaway --</option>
            {putawayStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.whatsapp})</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
