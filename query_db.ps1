$env:SUPABASE_URL = (Select-String -Path '.env.local' -Pattern 'NEXT_PUBLIC_SUPABASE_URL=(.*)' | % { $_.Matches.Groups[1].Value })
$env:SUPABASE_KEY = (Select-String -Path '.env.local' -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.*)' | % { $_.Matches.Groups[1].Value })
$headers = @{ 'apikey' = $env:SUPABASE_KEY; 'Authorization' = 'Bearer ' + $env:SUPABASE_KEY }

# 1. Get Antonio driver ID
$res = Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/md_drivers?name=ilike.*antonio*&select=id,name" -Headers $headers -Method Get
$res | ConvertTo-Json

# 2. Get JO for Antonio
foreach ($d in $res) {
    $jobs = Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/job_orders?driver_id=eq.$($d.id)&select=id,jo_number,status,driver_response,created_at" -Headers $headers -Method Get
    Write-Host "Jobs for $($d.name):"
    $jobs | ConvertTo-Json
}
