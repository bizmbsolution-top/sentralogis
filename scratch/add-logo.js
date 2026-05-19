const fs = require('fs');

let code = fs.readFileSync('app/(dashboard)/tenant/profile/page.tsx', 'utf8');

// Add imports
code = code.replace(/Building\r?\n\} from 'lucide-react';/, "Building, Image, UploadCloud\n} from 'lucide-react';");
code = code.replace(/import \{ useState \} from 'react';/, "import { useState, useEffect } from 'react';");

// Add state and effect
const hookInjection = `  const [passLoading, setPassLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('logo_url').eq('id', profile.tenant_id).single()
        .then(({data}) => {
          if (data?.logo_url) setLogoUrl(data.logo_url);
        });
    }
  }, [profile?.tenant_id]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile?.tenant_id) return;
      setUploadingLogo(true);

      const fileExt = file.name.split('.').pop();
      const fileName = \`\${profile.tenant_id}_\${Math.random()}.\${fileExt}\`;
      const filePath = \`tenant_logos/\${fileName}\`;

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('tenants').update({ logo_url: publicUrl }).eq('id', profile.tenant_id);
      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast.success('Tenant Logo updated successfully!');
    } catch (err: any) {
      toast.error('Upload failed. Ensure logo_url column exists in tenants table. ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };`;

code = code.replace(/  const \[passLoading, setPassLoading\] = useState\(false\);/, hookInjection);

// Add UI
const uiInjection = `
              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-white border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm">
                     {logoUrl ? <img src={logoUrl} alt="Tenant Logo" className="w-full h-full object-cover" /> : <Building className="w-8 h-8 text-blue-300" />}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Active Node</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">{profile?.company_name || 'Assigned Cluster'}</p>
                   </div>
                 </div>
                 
                 <div className="relative">
                   <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={uploadingLogo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                   <Button variant="outline" loading={uploadingLogo} icon={<UploadCloud className="w-4 h-4" />}>
                     {logoUrl ? 'Change Logo' : 'Upload Logo'}
                   </Button>
                 </div>
              </div>
`;

code = code.replace(/<div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">[\s\S]*?<\/div>/, uiInjection.trim());

fs.writeFileSync('app/(dashboard)/tenant/profile/page.tsx', code);
console.log('Done!');
