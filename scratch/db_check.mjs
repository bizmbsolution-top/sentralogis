import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envContent = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

console.log('Using URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  const { data, error, count } = await supabase.from('tenants').select('*', { count: 'exact' })
  if (error) console.error(error)
  else {
    console.log('Count:', count)
    console.log('Data:', data)
  }
}

check()
