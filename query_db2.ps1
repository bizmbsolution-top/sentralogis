$env:SUPABASE_URL = (Select-String -Path '.env.local' -Pattern 'NEXT_PUBLIC_SUPABASE_URL=(.*)' | % { $_.Matches.Groups[1].Value })
$env:SUPABASE_KEY = (Select-String -Path '.env.local' -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.*)' | % { $_.Matches.Groups[1].Value })
$headers = @{ 'apikey' = $env:SUPABASE_KEY; 'Authorization' = 'Bearer ' + $env:SUPABASE_KEY }

Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/md_drivers?name=ilike.*antonio*&select=id,name,phone,whatsapp,tenant_id,is_active" -Headers $headers -Method Get | ConvertTo-Json
