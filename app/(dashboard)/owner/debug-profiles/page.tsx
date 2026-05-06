'use client';

import { useState, useEffect } from 'react';
import { getAllProfilesAction } from '@/lib/actions/tenantActions';
import { Loader2, Database, Mail, User, Phone } from 'lucide-react';

export default function DebugProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const res = await getAllProfilesAction();
        if (res && 'error' in res) {
          console.error('Action Error:', res.error);
          setProfiles([]); // Empty list but we show raw json below
        } else {
          setProfiles(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Database className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Raw Profiles Data</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Direct server-side data inspection</p>
          </div>
        </div>
        <div className="px-6 py-2 bg-slate-900 border border-white/5 rounded-full">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profiles.length} TOTAL PROFILES</span>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-950/50 border-b border-white/5">
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile ID</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Email Identity</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-center">WhatsApp Number</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Full Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                </td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No profiles found in database</p>
                </td>
              </tr>
            ) : (
              profiles.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-all">
                  <td className="px-8 py-6">
                    <span className="text-[9px] font-mono text-slate-500">{p.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-600" />
                      <span className="text-xs font-bold text-slate-300">{p.email || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <Phone className="w-3 h-3 text-emerald-500" />
                      <span className="text-sm font-black text-emerald-400 italic">{p.whatsapp || 'NOT SET'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <User className="w-3 h-3" />
                      <span className="text-xs font-bold uppercase italic">{p.full_name || 'N/A'}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl flex items-start gap-4">
         <div className="p-2 bg-amber-500/10 rounded-xl">
            <Database className="w-5 h-5 text-amber-500" />
         </div>
         <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase italic tracking-widest">Diagnostic Tip</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold">
               Jika nomor WhatsApp di tabel ini muncul sebagai "NOT SET", berarti data tersebut memang belum tersimpan di database. 
               Harap pastikan tenant sudah mengklik "Save" di halaman My Profile mereka.
            </p>
         </div>
      </div>
      <div className="bg-slate-950 p-10 rounded-[3rem] border border-white/5 space-y-4">
         <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Raw JSON Response (Developer View)</h3>
         <pre className="text-[10px] text-emerald-500 font-mono overflow-x-auto p-6 bg-black/50 rounded-2xl border border-white/5">
            {JSON.stringify(profiles, null, 2)}
         </pre>
      </div>
    </div>
  );
}
