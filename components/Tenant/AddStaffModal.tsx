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
  { code: 'hq_director_ops', name: 'Direktur Operasional' },
  { code: 'hq_director_fin', name: 'Direktur Keuangan' },
  { code: 'hq_director_cs', name: 'Direktur Customer Service' },
  { code: 'hq_cs', name: 'Customer Service' },
  { code: 'hq_ops', name: 'Operations Staff' },
  { code: 'hq_finance', name: 'Finance Staff' },
];

const sbuRolesMap: any = {
  tr: [
    { code: 'sbu_manager_tr', name: 'Manager Trucking' },
    { code: 'sbu_admin_tr', name: 'Admin Kantor Trucking' },
    { code: 'sbu_ops_tr', name: 'Operations Trucking' },
    { code: 'sbu_fin_tr', name: 'Finance Trucking' },
  ],
  wh: [
    { code: 'sbu_manager_wh', name: 'Manager Warehouse' },
    { code: 'sbu_admin_wh', name: 'Admin Kantor Warehouse' },
    { code: 'sbu_ops_wh', name: 'Operations Warehouse' },
    { code: 'sbu_fin_wh', name: 'Finance Warehouse' },
  ],
  ink: [
    { code: 'sbu_manager_ink', name: 'Manager Clearance' },
    { code: 'sbu_admin_ink', name: 'Admin Kantor Clearance' },
    { code: 'sbu_ops_ink', name: 'Operations Clearance' },
    { code: 'sbu_fin_ink', name: 'Finance Clearance' },
  ],
  fwd: [
    { code: 'sbu_manager_fwd', name: 'Manager Forwarding' },
    { code: 'sbu_admin_fwd', name: 'Admin Kantor Forwarding' },
    { code: 'sbu_ops_fwd', name: 'Operations Forwarding' },
    { code: 'sbu_fin_fwd', name: 'Finance Forwarding' },
  ],
};

export default function AddStaffModal({ isOpen, onClose, onSuccess, sbus }: any) {
  const [loading, setLoading] = useState(false);
  const [staffType, setStaffType] = useState<'hq' | 'sbu'>('hq');
  const [selectedSbu, setSelectedSbu] = useState<any>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    whatsapp: '',
    roleCode: '',
    password: ''
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
        whatsapp: formData.whatsapp,
        password: formData.password
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
                onClick={() => { setStaffType('hq'); setFormData({...formData, roleCode: ''}); }}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${staffType === 'hq' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                HQ Staff
              </button>
              <button
                type="button"
                onClick={() => { setStaffType('sbu'); setFormData({...formData, roleCode: ''}); }}
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
              
              {staffType === 'sbu' ? (
                <div className="space-y-1.5">
                   <label className="text-sm font-bold text-slate-700 ml-1">Select Unit (SBU)</label>
                   <select 
                     className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5 appearance-none"
                     required
                     value={selectedSbu?.id || ''}
                     onChange={e => {
                       const sbu = sbus.find((s: any) => s.id === e.target.value);
                       setSelectedSbu(sbu);
                       setFormData({...formData, roleCode: ''});
                     }}
                   >
                     <option value="">Choose Unit...</option>
                     {sbus.map((s: any) => (
                       <option key={s.id} value={s.id}>{s.sbu_name} ({s.sbu_code})</option>
                     ))}
                   </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                   <label className="text-sm font-bold text-slate-700 ml-1">HQ Position</label>
                   <select 
                     className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5"
                     required
                     value={formData.roleCode}
                     onChange={e => setFormData({...formData, roleCode: e.target.value})}
                   >
                     <option value="">Select Position...</option>
                     {hqRoles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                   </select>
                </div>
              )}

              {staffType === 'sbu' && selectedSbu && (
                <div className="space-y-1.5 md:col-span-2">
                   <label className="text-sm font-bold text-slate-700 ml-1">SBU Position for {selectedSbu.sbu_name}</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sbuRolesMap[selectedSbu.sbu_type]?.map((r: any) => (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() => setFormData({...formData, roleCode: r.code})}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            formData.roleCode === r.code ? 'border-blue-500 bg-blue-50/50 shadow-inner' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <p className={`text-xs font-black uppercase tracking-widest ${formData.roleCode === r.code ? 'text-blue-700' : 'text-slate-500'}`}>{r.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium italic mt-1">Code: {r.code}</p>
                        </button>
                      ))}
                   </div>
                </div>
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
