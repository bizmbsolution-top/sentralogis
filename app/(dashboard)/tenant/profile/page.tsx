'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, Mail, Phone, Lock, 
  Shield, Key, Save, RefreshCw,
  Building, Image, UploadCloud
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
  const [logoUrl, setLogoUrl] = useState('');
  const [tenantName, setTenantName] = useState('Assigned Cluster');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('logo_url, name').eq('id', profile.tenant_id).single()
        .then(({data}) => {
          if (data?.logo_url) setLogoUrl(data.logo_url);
          if (data?.name) setTenantName(data.name);
        });
    }
  }, [profile?.tenant_id]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile?.tenant_id) return;
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', profile.tenant_id);

      const response = await fetch('/api/tenant/upload-logo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      setLogoUrl(data.url);
      toast.success('Tenant Logo updated successfully!');
      
      // Force reload page to update the sidebar instantly
      window.location.reload();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

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
              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-white border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm">
                     {logoUrl ? <img src={logoUrl} alt="Tenant Logo" className="w-full h-full object-cover" /> : <Building className="w-8 h-8 text-blue-300" />}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Active Node</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">{tenantName}</p>
                   </div>
                 </div>
                 
                 <div className="relative">
                   <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={uploadingLogo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                   <Button variant="primary" loading={uploadingLogo} icon={<UploadCloud className="w-4 h-4" />}>
                     {logoUrl ? 'Change Logo' : 'Upload Logo'}
                   </Button>
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
