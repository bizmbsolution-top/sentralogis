const fs = require('fs');
let code = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');

const newHook = `  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['Master Data']);
  const [tenantLogo, setTenantLogo] = useState('');

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('logo_url').eq('id', profile.tenant_id).single()
        .then(({data, error}) => {
           if (!error && data?.logo_url) setTenantLogo(data.logo_url);
        });
    }
  }, [profile?.tenant_id]);`;

code = code.replace(/  const \[openSubmenus, setOpenSubmenus\] = useState<string\[\]>\(\['Master Data'\]\);\s*const \[tenantLogo, setTenantLogo\] = useState\(''\);\s*const \[tenantName, setTenantName\] = useState\('COMPANY'\);\s*useEffect\(\(\) => \{[\s\S]*?\}\, \[profile\?\.tenant_id\]\);/, newHook);

const newHeader = `          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              {tenantLogo ? <img src={tenantLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-tighter text-slate-900 uppercase line-clamp-1 leading-tight">
                {profile?.full_name || 'Admin'}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {profile?.tenants?.name || 'Tenant'}
              </p>
            </div>
          </div>`;

code = code.replace(/          <div className="flex items-center gap-3">\s*<div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">\s*\{tenantLogo \? <img src=\{tenantLogo\} alt="Logo" className="w-full h-full object-cover" \/> : <Building className="w-5 h-5 text-slate-400" \/>\}\s*<\/div>\s*<h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic line-clamp-2 leading-tight">\s*\{tenantName\}\s*<\/h1>\s*<\/div>/, newHeader);

fs.writeFileSync('components/layout/Sidebar.tsx', code);
console.log('Fixed sidebar header');
