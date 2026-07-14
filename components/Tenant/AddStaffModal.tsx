'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  X, Mail, User, Phone, 
  Building2, Briefcase, Key, Loader2, CheckCircle2,
  Plus, Shield, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createStaffAdmin } from '@/app/(dashboard)/tenant/staff/actions';
import toast from 'react-hot-toast';

const hqRoles = [
  { code: 'hq_commercial_director', name: 'HQ Commercial Director', division: 'Commercial & Sales', level: 'director' },
  { code: 'hq_sales_manager', name: 'HQ Sales Manager', division: 'Commercial & Sales', level: 'manager' },
  { code: 'hq_sales_staff', name: 'HQ Sales Staff', division: 'Commercial & Sales', level: 'staff' },
  { code: 'hq_pricing_analyst', name: 'HQ Pricing Analyst', division: 'Commercial & Sales', level: 'staff' },
  { code: 'hq_marketing_staff', name: 'HQ Marketing Staff', division: 'Commercial & Sales', level: 'staff' },
  { code: 'hq_director_ops', name: 'Direktur Operasional', division: 'Operations', level: 'director' },
  { code: 'hq_director_fin', name: 'Direktur Keuangan', division: 'Finance', level: 'director' },
  { code: 'hq_director_bizdev', name: 'Direktur Business Development', division: 'General / Management', level: 'director' },
  { code: 'hq_director_hrd', name: 'Direktur HRD', division: 'HR & Admin', level: 'director' },
  { code: 'hq_director_cs', name: 'Direktur Customer Service', division: 'Operations', level: 'director' },
  { code: 'hq_cs', name: 'Customer Service', division: 'Operations', level: 'staff' },
  { code: 'hq_ops', name: 'Operations Staff', division: 'Operations', level: 'staff' },
  { code: 'hq_finance', name: 'Finance Staff', division: 'Finance', level: 'staff' },
  { code: 'tenant_admin', name: 'Tenant Admin / Management', division: 'General / Management', level: 'manager' },
];

const sbuRolesMap: any = {
  tr: [
    { code: 'sbu_manager_tr', name: 'Manager Trucking', division: 'General / Management', level: 'manager' },
    { code: 'sbu_admin_tr', name: 'Admin Kantor Trucking', division: 'HR & Admin', level: 'staff' },
    { code: 'sbu_ops_tr', name: 'Operations Trucking', division: 'Operations', level: 'staff' },
    { code: 'sbu_fin_tr', name: 'Finance Trucking', division: 'Finance', level: 'staff' },
  ],
  wh: [
    { code: 'sbu_manager_wh', name: 'Manager Warehouse', division: 'General / Management', level: 'manager' },
    { code: 'sbu_admin_wh', name: 'Admin Kantor Warehouse', division: 'HR & Admin', level: 'staff' },
    { code: 'sbu_ops_wh', name: 'Operations Warehouse', division: 'Operations', level: 'staff' },
    { code: 'sbu_fin_wh', name: 'Finance Warehouse', division: 'Finance', level: 'staff' },
  ],
  ink: [
    { code: 'sbu_manager_ink', name: 'Manager Clearance', division: 'General / Management', level: 'manager' },
    { code: 'sbu_admin_ink', name: 'Admin Kantor Clearance', division: 'HR & Admin', level: 'staff' },
    { code: 'sbu_ops_ink', name: 'Operations Clearance', division: 'Operations', level: 'staff' },
    { code: 'sbu_fin_ink', name: 'Finance Clearance', division: 'Finance', level: 'staff' },
  ],
  fwd: [
    { code: 'sbu_manager_fwd', name: 'Manager Forwarding', division: 'General / Management', level: 'manager' },
    { code: 'sbu_admin_fwd', name: 'Admin Kantor Forwarding', division: 'HR & Admin', level: 'staff' },
    { code: 'sbu_ops_fwd', name: 'Operations Forwarding', division: 'Operations', level: 'staff' },
    { code: 'sbu_fin_fwd', name: 'Finance Forwarding', division: 'Finance', level: 'staff' },
  ],
};

export default function AddStaffModal({ isOpen, onClose, onSuccess, sbus, warehouses }: any) {
  const [loading, setLoading] = useState(false);
  const [staffType, setStaffType] = useState<'hq' | 'sbu'>('hq');
  const [jobLevel, setJobLevel] = useState<string>('');
  const [selectedSbu, setSelectedSbu] = useState<any>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [successData, setSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    whatsapp: '',
    roleCode: '',
    password: '',
    division: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tenant } = await supabase.from('tenants').select('tenant_code').eq('user_id', user?.id).single();
      
      if (!tenant) throw new Error('Tenant context not found');

      const result = await createStaffAdmin({
        tenantCode: tenant.tenant_code,
        email: formData.email,
        fullName: formData.fullName,
        roleCode: formData.roleCode,
        sbuCode: staffType === 'sbu' ? selectedSbu?.sbu_code : null,
        warehouseId: staffType === 'sbu' && selectedWarehouseId ? selectedWarehouseId : null,
        whatsapp: formData.whatsapp,
        password: formData.password,
        division: formData.division
      });

      if (!result.success) throw new Error(result.message);

      setSuccessData({ temp_password: formData.password });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] w-full max-w-md p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 italic">Staff Authorized!</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Credentials have been deployed successfully.</p>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-6 space-y-4 text-left border border-slate-100">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Password</p>
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200">
                   <code className="text-lg font-black text-blue-600 tracking-wider">{successData.temp_password}</code>
                </div>
             </div>
          </div>

          <Button 
            className="w-full !py-6 !bg-slate-900"
            onClick={() => { 
              setSuccessData(null); 
              setFormData({ email: '', fullName: '', whatsapp: '', roleCode: '', password: '' });
              onClose(); 
            }}
          >
            Acknowledge & Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8 duration-500 my-auto">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={20}/></div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Authorize New Staff</h2>
                <p className="text-xs font-medium text-slate-500">Deploy a new node to your organization.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => { setStaffType('hq'); setSelectedSbu(null); setSelectedWarehouseId(''); setJobLevel(''); setFormData({...formData, roleCode: '', division: ''}); }}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${staffType === 'hq' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                HQ Staff
              </button>
              <button
                type="button"
                onClick={() => { setStaffType('sbu'); setJobLevel(''); setFormData({...formData, roleCode: '', division: ''}); }}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${staffType === 'sbu' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                SBU Staff
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input 
                label="Full Name" 
                required
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                icon={<User className="w-4 h-4 text-slate-400"/>}
              />
              <Input 
                label="Primary Email" 
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                icon={<Mail className="w-4 h-4 text-slate-400"/>}
              />
              <Input 
                label="Staff Password" 
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="Set manually"
                icon={<Lock className="w-4 h-4 text-slate-400"/>}
              />
              <Input 
                label="WhatsApp (Optional)" 
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                icon={<Phone className="w-4 h-4 text-slate-400"/>}
              />
              
              {staffType === 'sbu' && (
                <div className="space-y-1.5 md:col-span-2">
                   <label className="text-sm font-bold text-slate-700 ml-1">Select Unit (SBU)</label>
                   <select 
                     className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5 appearance-none"
                     required
                     value={selectedSbu?.id || ''}
                     onChange={e => {
                       const sbu = sbus.find((s: any) => s.id === e.target.value);
                       setSelectedSbu(sbu);
                       setJobLevel('');
                       setFormData({...formData, roleCode: '', division: ''});
                     }}
                   >
                     <option value="">Choose Unit...</option>
                     {sbus.map((s: any) => (
                       <option key={s.id} value={s.id}>{s.sbu_name} ({s.sbu_code})</option>
                     ))}
                   </select>
                </div>
              )}

              {(staffType === 'hq' || (staffType === 'sbu' && selectedSbu)) && (
                <>
                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700 ml-1">Division (Divisi)</label>
                     <select 
                       className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5"
                       value={formData.division}
                       onChange={e => {
                         const newDiv = e.target.value;
                         const rawRoles = staffType === 'hq' ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const filtered = rawRoles
                           .filter((r: any) => !newDiv || r.division === newDiv)
                           .filter((r: any) => !jobLevel || r.level === jobLevel);
                         const valid = filtered.some((r: any) => r.code === formData.roleCode);
                         setFormData({
                           ...formData,
                           division: newDiv,
                           roleCode: valid ? formData.roleCode : (filtered.length === 1 ? filtered[0].code : '')
                         });
                       }}
                     >
                       <option value="">-- All Divisions --</option>
                       {(staffType === 'hq' 
                         ? ['General / Management', 'Commercial & Sales', 'Operations', 'Finance', 'HR & Admin', 'IT']
                         : ['General / Management', 'Operations', 'Finance', 'HR & Admin']
                       ).map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700 ml-1">Level / Jenjang</label>
                     <select 
                       className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5"
                       value={jobLevel}
                       onChange={e => {
                         const newLvl = e.target.value;
                         setJobLevel(newLvl);
                         const rawRoles = staffType === 'hq' ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const filtered = rawRoles
                           .filter((r: any) => !formData.division || r.division === formData.division)
                           .filter((r: any) => !newLvl || r.level === newLvl);
                         const valid = filtered.some((r: any) => r.code === formData.roleCode);
                         if (!valid) {
                           setFormData(prev => ({
                             ...prev,
                             roleCode: filtered.length === 1 ? filtered[0].code : ''
                           }));
                         }
                       }}
                     >
                       <option value="">-- All Levels --</option>
                       {(staffType === 'hq'
                         ? [{ id: 'director', label: 'Direktur' }, { id: 'manager', label: 'Manager' }, { id: 'staff', label: 'Staff' }]
                         : [{ id: 'manager', label: 'Manager' }, { id: 'staff', label: 'Staff' }]
                       ).map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                     <label className="text-sm font-bold text-slate-700 ml-1">Position / Role Code</label>
                     <select 
                       className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5"
                       required
                       value={formData.roleCode}
                       onChange={e => {
                         const newCode = e.target.value;
                         const rawRoles = staffType === 'hq' ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const roleObj = rawRoles.find((r: any) => r.code === newCode);
                         if (roleObj) {
                           setJobLevel(roleObj.level);
                           setFormData({
                             ...formData,
                             roleCode: newCode,
                             division: roleObj.division
                           });
                         } else {
                           setFormData({ ...formData, roleCode: newCode });
                         }
                       }}
                     >
                       <option value="">Select Position...</option>
                        {(() => {
                          const rawRoles = staffType === 'hq' ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                          const filtered = rawRoles
                            .filter((r: any) => !formData.division || r.division === formData.division)
                            .filter((r: any) => !jobLevel || r.level === jobLevel);
                          const listToShow = filtered.length > 0 ? filtered : rawRoles;
                          return (
                            <>
                              {filtered.length === 0 && (formData.division || jobLevel) && (
                                <option value="" disabled>-- No exact match for filter (Showing all {rawRoles.length}) --</option>
                              )}
                              {listToShow.map((r: any) => (
                                <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                              ))}
                            </>
                          );
                        })()}
                     </select>
                  </div>

                  {staffType === 'sbu' && selectedSbu && warehouses?.filter((w: any) => w.sbu_id === selectedSbu.id).length > 0 && (
                    <div className="space-y-1.5 md:col-span-2 mt-2">
                       <label className="text-sm font-bold text-slate-700 ml-1">Assign to Specific Warehouse (Optional)</label>
                       <p className="text-[10px] font-bold text-slate-400 ml-1 mb-1">If empty, staff manages all warehouses in this SBU.</p>
                       <select 
                         className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5 appearance-none"
                         value={selectedWarehouseId}
                         onChange={e => setSelectedWarehouseId(e.target.value)}
                       >
                         <option value="">-- All SBU Warehouses --</option>
                         {warehouses.filter((w: any) => w.sbu_id === selectedSbu.id).map((w: any) => (
                           <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                         ))}
                       </select>
                    </div>
                  )}
                </>
              )}
           </div>

           <div className="flex justify-end gap-3 pt-6">
               <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button 
                type="submit" 
                className="!bg-slate-900 !px-10" 
                loading={loading}
                icon={<Shield className="w-4 h-4"/>}
              >
                Authorize Staff
              </Button>
           </div>
        </form>
      </div>
    </div>
  );
}
