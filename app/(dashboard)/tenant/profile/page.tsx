'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, Mail, Phone, Lock, 
  Shield, Key, Save, RefreshCw,
  Building
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function TenantProfilePage() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: name,
        whatsapp: whatsapp
      }).eq('id', user?.id);
      if (error) throw error;
      toast.success('Node Profile Synchronized');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) return toast.error('Key must be at least 6 characters');
    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Security Access Rotated');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-slide-up">
      <Toaster position="top-right" />
      
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Profile Protocol</h1>
        <p className="text-sm font-medium text-slate-500">Manage your node administrator identity and connection settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-1 space-y-4">
           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Node Identity</h3>
           <p className="text-xs text-slate-500 leading-relaxed">
             This identity is used for official coordination between your cluster and the global network.
           </p>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
                 <Building className="w-5 h-5 text-blue-600" />
                 <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Current Active Node</p>
                    <p className="text-sm font-bold text-slate-900">{profile?.company_name || 'Assigned Cluster'}</p>
                 </div>
              </div>
              <Input 
                label="Admin Display Name"
                value={name}
                onChange={e => setName(e.target.value)}
                icon={<User className="w-4 h-4" />}
              />
              <Input 
                label="WhatsApp Connection"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="0812XXXXXXXX"
                icon={<Phone className="w-4 h-4" />}
              />
              <div className="pt-4">
                <Button onClick={handleUpdateProfile} loading={loading} icon={<Save className="w-4 h-4" />}>
                  Update Identity
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-px bg-slate-200" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-1 space-y-4">
           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Security Gateway</h3>
           <p className="text-xs text-slate-500 leading-relaxed">
             Rotate your security key regularly to protect your node credits and operational data.
           </p>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardContent className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                 <Mail className="w-5 h-5 text-slate-400" />
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticated Email</p>
                    <p className="text-sm font-bold text-slate-900">{profile?.email}</p>
                 </div>
              </div>
              <Input 
                label="New Security Key"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="MIN. 6 CHARACTERS"
                icon={<Key className="w-4 h-4" />}
              />
              <div className="pt-4">
                <Button 
                  onClick={handleUpdatePassword} 
                  loading={passLoading} 
                  variant="secondary"
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Authorize New Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
