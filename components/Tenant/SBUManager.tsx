'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Building2, Plus, Box, Truck, 
  FileCheck, Globe, Loader2, Trash2, Power
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

const sbuTypes = [
  { id: 'tr', label: 'Trucking Unit', icon: <Truck size={20}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'wh', label: 'Warehouse Unit', icon: <Box size={20}/>, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'ink', label: 'Clearance (INK)', icon: <FileCheck size={20}/>, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'fwd', label: 'Forwarding Unit', icon: <Globe size={20}/>, color: 'text-indigo-600', bg: 'bg-indigo-50' }
];

export default function SBUManager({ sbus, onUpdate }: any) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSbu, setNewSbu] = useState({
    name: '',
    code: '',
    type: 'tr'
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tid = profile?.tenant_id;
      if (!tid) throw new Error('Tenant not found');

      const { error } = await supabase
        .from('tenant_sbus')
        .insert({
          tenant_id: tid,
          sbu_type: newSbu.type,
          sbu_code: newSbu.code.toUpperCase(),
          sbu_name: newSbu.name,
          created_by: profile?.id
        });

      if (error) throw error;
      toast.success('Business Unit (SBU) Activated');
      setShowAddForm(false);
      setNewSbu({ name: '', code: '', type: 'tr' });
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const { error } = await supabase
        .from('tenant_sbus')
        .update({ status: currentStatus === 'active' ? 'inactive' : 'active' })
        .eq('id', id);
      
      if (error) throw error;
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Building2 size={24}/></div>
            <div>
               <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Cluster Network Management</h2>
               <p className="text-xs font-medium text-slate-500">Deploy and manage specialized business units (SBU).</p>
            </div>
         </div>
         <Button 
            className="!bg-slate-900 gap-2"
            onClick={() => setShowAddForm(!showAddForm)}
            icon={showAddForm ? <Trash2 size={18}/> : <Plus size={18}/>}
         >
            {showAddForm ? 'Cancel Creation' : 'Register New Unit'}
         </Button>
      </div>

      {showAddForm && (
        <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
          <CardContent className="p-8">
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
               <div className="md:col-span-1">
                  <Input 
                    label="SBU Name" 
                    placeholder="e.g. Makmur Trucking"
                    required 
                    value={newSbu.name}
                    onChange={e => setNewSbu({...newSbu, name: e.target.value})}
                  />
               </div>
               <div className="md:col-span-1">
                  <Input 
                    label="Unique Code" 
                    placeholder="e.g. TR-01"
                    required 
                    value={newSbu.code}
                    onChange={e => setNewSbu({...newSbu, code: e.target.value})}
                  />
               </div>
               <div className="md:col-span-1 space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Specialization Type</label>
                  <select 
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    value={newSbu.type}
                    onChange={e => setNewSbu({...newSbu, type: e.target.value})}
                  >
                    {sbuTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
               </div>
               <Button type="submit" className="w-full !h-11 !bg-blue-600" loading={loading}>Deploy Unit</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sbus.map((s: any) => {
          const typeInfo = sbuTypes.find(t => t.id === s.sbu_type) || sbuTypes[0];
          return (
            <Card key={s.id} className="group hover:border-blue-300 transition-all shadow-lg hover:shadow-blue-500/10 border-slate-100 overflow-hidden relative">
               <div className={`h-1.5 w-full ${s.status === 'active' ? 'bg-blue-600' : 'bg-slate-300'}`} />
               <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className={`w-12 h-12 ${typeInfo.bg} ${typeInfo.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                        {typeInfo.icon}
                     </div>
                     <button 
                      onClick={() => toggleStatus(s.id, s.status)}
                      className={`p-2 rounded-xl transition-all ${s.status === 'active' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
                     >
                        <Power size={18}/>
                     </button>
                  </div>
                  <div>
                     <h3 className="font-black text-slate-900 uppercase italic tracking-tight truncate">{s.sbu_name}</h3>
                     <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">Cluster Code: {s.sbu_code}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <Badge variant="default" className="!text-[9px] uppercase font-black tracking-widest italic">{typeInfo.label}</Badge>
                     <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {s.status}
                     </span>
                  </div>
               </CardContent>
            </Card>
          );
        })}

        {sbus.length === 0 && !showAddForm && (
           <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">No Business Units Active</p>
              <p className="text-sm text-slate-400 font-medium italic mt-2">Deploy your first unit to start managing staff.</p>
           </div>
        )}
      </div>
    </div>
  );
}
