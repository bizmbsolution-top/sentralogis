import fs from 'fs'

const filePath = 'app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx'
let content = fs.readFileSync(filePath, 'utf8')

const oldCode = `      let activeToken = jo.driver_link_token;

      if (!activeToken) {
          activeToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await supabase.from('job_orders').update({ driver_link_token: activeToken }).eq('id', jo.id);
          setJobOrders(prev => prev.map(j => j.id === jo.id ? { ...j, driver_link_token: activeToken } : j));
      }`

const newCode = `      let activeToken = jo.driver_link_token || jo.tracking_token;

      if (!activeToken) {
          activeToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          const { error } = await supabase
            .from('job_orders')
            .update({ 
               driver_link_token: activeToken,
               tracking_token: activeToken 
            })
            .eq('id', jo.id);

          if (error) {
            console.error("Failed to save token:", error);
            toast.error("Gagal menyimpan link akses driver.");
            return;
          }

          setJobOrders(prev => prev.map(j => j.id === jo.id ? { ...j, driver_link_token: activeToken, tracking_token: activeToken } : j));
          toast.success("Link akses baru telah didaftarkan.");
      }`

// Use a regex that is insensitive to whitespace within lines if possible, 
// but here I'll just try to match the structure
if (content.includes('let activeToken = jo.driver_link_token;')) {
    console.log("Found target code, applying patch...")
    // Simple replacement of the block
    content = content.replace(/let activeToken = jo\.driver_link_token;[\s\S]*?setJobOrders\(prev => prev\.map\(j => j\.id === jo\.id \? \{ \.\.\.j, driver_link_token: activeToken \} : j\)\);[\s\S]*?\}/, 
    newCode + '\n      }')
    fs.writeFileSync(filePath, content)
    console.log("Patch applied successfully!")
} else {
    console.log("Target code not found precisely. Checking variants...")
    console.log("First 50 chars of target search area:", content.indexOf('let activeToken = jo.driver_link_token'))
}
