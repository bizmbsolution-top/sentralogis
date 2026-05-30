// [AI] List profiles to see test users
const fs = require('fs');
const path = require('path');

try {
  global.WebSocket = require('ws');
} catch (e) {
  global.WebSocket = class {};
}

const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    console.log("Profiles in DB:", profiles);
  } catch (err) {
    console.error("Failed to list users:", err);
  }
}

listUsers();
