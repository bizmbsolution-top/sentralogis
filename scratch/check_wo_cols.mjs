import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1]
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function check() {
  const { data, error } = await supabase.from('work_orders').select('*').limit(1)
  if (error) console.error(error)
  else console.log(Object.keys(data[0]))
}

check()
