'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Users, Search, Plus, Shield, ShieldAlert, Key, Loader2, Warehouse, Truck, ScanLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/Table';
import toast, { Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/Input';

export default function WarehouseStaffPage() {
  const { user, profile } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    pin: '',
    role: 'SECURITY',
    warehouse_id: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      // 1. Fetch Staff
      const { data: staffData, error: staffError } = await supabase
        .from('md_warehouse_staff')
        .select('*, md_warehouses(name)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
        
      if (staffError && staffError.code !== '42P01') throw staffError;
      
      // 2. Fetch Warehouses for dropdown
      const { data: whData, error: whError } = await supabase
        .from('md_warehouses')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id);

      if (whError) throw whError;

      setStaff(staffData || []);
      setWarehouses(whData || []);
      
      if (profile?.warehouse_id) {
         setFormData(prev => ({ ...prev, warehouse_id: profile.warehouse_id }));
      } else if (whData && whData.length > 0) {
         setFormData(prev => ({ ...prev, warehouse_id: whData[0].id }));
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === '42P01') {
        toast.error('Table md_warehouse_staff not found. Please run Migration 071.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.tenant_id]);

  const isAllowed = profile && ['tenant_superadmin', 'sbu_manager_wh', 'sbu_ops_wh', 'sbu_admin_wh'].includes(profile.role);
  if (profile && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <ShieldAlert className="w-16 h-16 text-slate-200" />
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest italic">Access Restricted</h2>
        <p className="text-sm text-slate-500 font-medium">Only Warehouse Management can manage ground staff.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    
    try {
      // Get the first SBU of type WH for this tenant as a default (or specific one if available)
      const { data: sbuData } = await supabase
        .from('tenant_sbus')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('sbu_type', 'wh')
        .limit(1)
        .single();
        
      if (!sbuData) throw new Error('Warehouse SBU not found for this tenant.');

      const { error } = await supabase
        .from('md_warehouse_staff')
        .insert({
          tenant_id: profile.tenant_id,
          sbu_id: sbuData.id,
          warehouse_id: formData.warehouse_id || null,
          name: formData.name,
          whatsapp: formData.whatsapp.replace(/\D/g, ''), // Strip non-numeric
          pin: formData.pin,
          role: formData.role
        });

      if (error) throw error;
      
      toast.success('Staff added successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', whatsapp: '', pin: '', role: 'SECURITY', warehouse_id: warehouses[0]?.id || '' });
      fetchData();
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('Gagal: Nomor WhatsApp ini sudah terdaftar untuk staff lain.');
      } else {
        toast.error(err.message || 'Failed to add staff');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('md_warehouse_staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);
      if (error) throw error;
      fetchData();
      toast.success(currentStatus ? 'Staff deactivated' : 'Staff activated');
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'SECURITY': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'TALLY': return <ScanLine className="w-4 h-4 text-blue-500" />;
      case 'PUTAWAY': return <Warehouse className="w-4 h-4 text-emerald-500" />;
      default: return <Users className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'SECURITY': return 'Security (Gate)';
      case 'TALLY': return 'Tally Checker (Loading Dock)';
      case 'PUTAWAY': return 'Putaway Operator (Forklift)';
      default: return role;
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.whatsapp.includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1 italic">Warehouse Ground Staff</h1>
          <p className="text-sm font-medium text-slate-500 italic">Manage field operators for PWA Assignment</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="!bg-slate-900 gap-2">
          <Plus size={18} /> Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-rose-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm"><ShieldAlert size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Gate Control</p>
                  <h3 className="text-xl font-black text-rose-900">{staff.filter(s => s.role === 'SECURITY').length} Security</h3>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-blue-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><ScanLine size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Dock Ops</p>
                  <h3 className="text-xl font-black text-blue-900">{staff.filter(s => s.role === 'TALLY').length} Tally</h3>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-emerald-50 border-none">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Warehouse size={20}/></div>
               <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Inventory Ops</p>
                  <h3 className="text-xl font-black text-emerald-900">{staff.filter(s => s.role === 'PUTAWAY').length} Putaway</h3>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 text-sm"
          />
        </div>

        <Card className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/50">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Name / WA</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Role</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Warehouse</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" size={32}/></TableCell></TableRow>
              ) : filteredStaff.length > 0 ? filteredStaff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-[10px] font-mono text-slate-500">{s.whatsapp}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {getRoleIcon(s.role)}
                       <span className="text-[10px] font-black uppercase tracking-widest">{s.role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-slate-600">{s?.md_warehouses?.name || 'All'}</span>
                  </TableCell>
                  <TableCell>
                    <button 
                      onClick={() => toggleStatus(s.id, s.is_active)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${s.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" className="!h-8 !px-3 text-xs border-slate-200">Reset PIN</Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} className="py-20 text-center text-slate-500 text-sm">No staff found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                 <h2 className="text-lg font-bold text-slate-900">Add Field Staff</h2>
                 <p className="text-xs text-slate-500">Create login for WA+PIN Portal</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Full Name</label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Anton Security" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">WhatsApp Number</label>
                  <Input required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="08123456789" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Login PIN (4-6 digits)</label>
                  <Input required type="password" maxLength={6} value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} placeholder="123456" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block">Assign Role</label>
                  <div className="grid grid-cols-3 gap-2">
                     {['SECURITY', 'TALLY', 'PUTAWAY'].map(r => (
                        <button 
                          key={r} type="button"
                          onClick={() => setFormData({...formData, role: r})}
                          className={`py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.role === r ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          {r}
                        </button>
                     ))}
                  </div>
               </div>
               {profile?.warehouse_id ? (
                 <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block mt-2">Warehouse Location</label>
                    <div className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium flex items-center">
                       {warehouses.find(w => w.id === profile.warehouse_id)?.name || 'Default Warehouse'}
                    </div>
                 </div>
               ) : (
                 <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 block mt-2">Warehouse Location</label>
                    <select 
                       className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900/5"
                       value={formData.warehouse_id}
                       onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                    >
                       <option value="">-- All Warehouses --</option>
                       {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                 </div>
               )}
               
               <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                 <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                 <Button type="submit" className="!bg-slate-900" loading={saving}>Save Staff</Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
