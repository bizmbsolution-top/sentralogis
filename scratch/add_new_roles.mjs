import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1]
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function migrate() {
  const newRoles = [
    {
      role_code: 'hq_director_comm',
      role_name: 'Direktur Komersial',
      role_level: 2,
      sbu_type: null,
      permissions: ['view_all_sbu', 'manage_commercial']
    },
    {
      role_code: 'hq_director_bizdev',
      role_name: 'Direktur Pengembangan Usaha',
      role_level: 2,
      sbu_type: null,
      permissions: ['view_all_sbu', 'manage_bizdev']
    }
  ]

  for (const role of newRoles) {
    const { data, error } = await supabase
      .from('tenant_roles')
      .upsert(role, { onConflict: 'role_code' })
    
    if (error) console.error(`Error inserting ${role.role_code}:`, error)
    else console.log(`Successfully inserted/updated ${role.role_code}`)
  }
}

migrate()
