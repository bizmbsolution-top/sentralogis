'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, RefreshCcw, Power, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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

export default function EditStaffModal({ isOpen, staff, onClose, onSuccess, sbus, warehouses, regions }: any) {
  const staffObj = (staff || {}) as any;
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(staffObj.is_active ?? true);
  const [fullName, setFullName] = useState(staffObj.full_name ?? '');
  const [roleCode, setRoleCode] = useState(staffObj.role_code ?? '');
  const [sbuId, setSbuId] = useState(staffObj.sbu_id || '');
  const [warehouseId, setWarehouseId] = useState(staffObj.warehouse_id || '');
  const [regionId, setRegionId] = useState(staffObj.region_id || '');
  const [division, setDivision] = useState(() => {
    const allRoles: any[] = [...hqRoles, ...Object.values(sbuRolesMap).flat()];
    const found = allRoles.find((r: any) => r.code === staffObj.role_code);
    return found ? found.division : (staffObj.division === 'General' ? 'General / Management' : (staffObj.division || ''));
  });
  const [jobLevel, setJobLevel] = useState(() => {
    const allRoles: any[] = [...hqRoles, ...Object.values(sbuRolesMap).flat()];
    const found = allRoles.find((r: any) => r.code === staffObj.role_code);
    return found ? found.level : '';
  });

  if (!isOpen || !staff) return null;

  const selectedSbu = sbus?.find((s: any) => s.id === sbuId);

  const handleSbuChange = (newSbuId: string) => {
    setSbuId(newSbuId);
    setWarehouseId('');
    setRegionId('');

    if (!newSbuId) {
      // Switched to Central HQ
      if (roleCode.startsWith('sbu_') || !hqRoles.some(r => r.code === roleCode)) {
        setRoleCode('hq_ops');
        setJobLevel('staff');
        setDivision('Operations');
      }
    } else {
      // Switched to an SBU
      const newSbu = sbus?.find((s: any) => s.id === newSbuId);
      if (newSbu) {
        const validRoles = sbuRolesMap[newSbu.sbu_type] || [];
        if (!validRoles.some((r: any) => r.code === roleCode)) {
          if (validRoles.length > 0) {
            setRoleCode(validRoles[0].code);
            setJobLevel(validRoles[0].level);
            setDivision(validRoles[0].division);
          }
        }
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await (supabase
        .from('tenant_users' as any) as any)
        .update({ 
          full_name: fullName,
          role_code: roleCode,
          sbu_id: sbuId || null,
          warehouse_id: sbuId ? (warehouseId || null) : null,
          region_id: sbuId ? (regionId || null) : null,
          division: sbuId ? null : (division || null),
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffObj.id);

      if (error) throw error;
      
      // Sync assigned_region_id to wo_organization_users for SBU Trucking region filtering
      if (sbuId) {
        const { error: woOrgError } = await (supabase
          .from('wo_organization_users' as any) as any)
          .update({ assigned_region_id: regionId || null })
          .eq('user_id', staffObj.user_id)
          .eq('tenant_id', staffObj.tenant_id);

        if (woOrgError) {
          console.error('[EditStaffModal] Failed to update wo_organization_users:', woOrgError);
        }
      }

      // Also update profile full_name and role for consistency
      await (supabase.from('profiles' as any) as any).update({ 
        full_name: fullName,
        role: roleCode
      }).eq('id', staffObj.user_id);

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
                    <p className="text-sm font-bold text-slate-900 italic">{staffObj.profiles?.email}</p>
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
                       onChange={e => handleSbuChange(e.target.value)}
                       className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                     >
                        <option value="">Central HQ</option>
                        {sbus?.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.sbu_name}</option>
                        ))}
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Division (Divisi)</label>
                     <select 
                       value={division}
                       onChange={e => {
                         const newDiv = e.target.value;
                         const rawRoles = !sbuId ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const filtered = rawRoles
                           .filter((r: any) => !newDiv || r.division === newDiv)
                           .filter((r: any) => !jobLevel || r.level === jobLevel);
                         const valid = filtered.some((r: any) => r.code === roleCode);
                         setDivision(newDiv);
                         if (!valid && filtered.length === 1) {
                           setRoleCode(filtered[0].code);
                         }
                       }}
                       className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                     >
                       <option value="">-- All Divisions --</option>
                       {(!sbuId 
                         ? ['General / Management', 'Commercial & Sales', 'Operations', 'Finance', 'HR & Admin', 'IT']
                         : ['General / Management', 'Operations', 'Finance', 'HR & Admin']
                       ).map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Level / Jenjang</label>
                     <select 
                       value={jobLevel}
                       onChange={e => {
                         const newLvl = e.target.value;
                         setJobLevel(newLvl);
                         const rawRoles = !sbuId ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const filtered = rawRoles
                           .filter((r: any) => !division || r.division === division)
                           .filter((r: any) => !newLvl || r.level === newLvl);
                         const valid = filtered.some((r: any) => r.code === roleCode);
                         if (!valid && filtered.length === 1) {
                           setRoleCode(filtered[0].code);
                         }
                       }}
                       className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                     >
                       <option value="">-- All Levels --</option>
                       {(!sbuId
                         ? [{ id: 'director', label: 'Direktur' }, { id: 'manager', label: 'Manager' }, { id: 'staff', label: 'Staff' }]
                         : [{ id: 'manager', label: 'Manager' }, { id: 'staff', label: 'Staff' }]
                       ).map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                  </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Position / Role Code</label>
                     <select 
                       value={roleCode}
                       onChange={e => {
                         const newCode = e.target.value;
                         const rawRoles = !sbuId ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const roleObj = rawRoles.find((r: any) => r.code === newCode);
                         if (roleObj) {
                           setJobLevel(roleObj.level);
                           setRoleCode(newCode);
                           setDivision(roleObj.division);
                         } else {
                           setRoleCode(newCode);
                         }
                       }}
                       className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                       required
                     >
                       <option value="">Select Position...</option>
                       {(() => {
                         const rawRoles = !sbuId ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || []);
                         const filtered = rawRoles
                           .filter((r: any) => !division || r.division === division)
                           .filter((r: any) => !jobLevel || r.level === jobLevel);
                         const listToShow = filtered.length > 0 ? filtered : rawRoles;
                         return (
                           <>
                             {filtered.length === 0 && (division || jobLevel) && (
                               <option value="" disabled>-- No exact match for filter (Showing all {rawRoles.length}) --</option>
                             )}
                             {listToShow.map((r: any) => (
                               <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                             ))}
                           </>
                         );
                       })()}
                       {roleCode && !(!sbuId ? hqRoles : (sbuRolesMap[selectedSbu?.sbu_type] || [])).some((r: any) => r.code === roleCode) && (
                         <option value={roleCode}>{roleCode} (Current)</option>
                       )}
                     </select>
                  </div>
               </div>

{sbuId && warehouses?.filter((w: any) => w.sbu_id === sbuId).length > 0 && (
                 <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Warehouse Assignment</label>
                    <select 
                      value={warehouseId}
                      onChange={e => setWarehouseId(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                    >
                      <option value="">-- All SBU Warehouses --</option>
                      {warehouses.filter((w: any) => w.sbu_id === sbuId).map((w: any) => (
                        <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                      ))}
                    </select>
                 </div>
               )}

               {sbuId && (
                 <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Region Assignment (Required for Trucking)</label>
                    <select 
                      value={regionId}
                      onChange={e => setRegionId(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                      required
                    >
                      <option value="">-- Select Region --</option>
                      {(regions || []).map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                 </div>
               )}

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
               <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
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
