const fs = require('fs');

let code = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');

// Add imports
code = code.replace(/import \{ useAuth \} from '@\/lib\/hooks\/useAuth';/, "import { useAuth } from '@/lib/hooks/useAuth';\nimport { supabase } from '@/lib/supabaseClient';\nimport { useEffect } from 'react';\nimport { Building } from 'lucide-react';");

// Add state
const hookInjection = `  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['Master Data']);
  const [tenantLogo, setTenantLogo] = useState('');
  const [tenantName, setTenantName] = useState('COMPANY');

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase.from('tenants').select('name, logo_url').eq('id', profile.tenant_id).single()
        .then(({data}) => {
           if (data?.name) setTenantName(data.name);
           if (data?.logo_url) setTenantLogo(data.logo_url);
        });
    }
  }, [profile?.tenant_id]);`;

code = code.replace(/  const \[openSubmenus, setOpenSubmenus\] = useState<string\[\]>\(\['Master Data'\]\);/, hookInjection);

// Replace SENTRALOGIS
const headerInjection = `          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              {tenantLogo ? <img src={tenantLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building className="w-5 h-5 text-slate-400" />}
            </div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic line-clamp-2 leading-tight">
              {tenantName}
            </h1>
          </div>`;

code = code.replace(/          <h1 className="text-xl font-bold tracking-tight text-slate-900">\s*SENTRALOGIS\s*<\/h1>/, headerInjection);

fs.writeFileSync('components/layout/Sidebar.tsx', code);
console.log('Sidebar Done!');
