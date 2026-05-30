// [AI] Reset admin password for testing
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

async function resetPassword() {
  console.log("Resetting password for admin@halu.com...");
  try {
    const { data, error } = await supabase.auth.admin.updateUserById('191edf81-400c-4551-8c19-2bcb8a511835', {
      password: 'password123'
    });

    if (error) throw error;
    console.log("Password reset successfully for admin@halu.com!");
  } catch (err) {
    console.error("Failed to reset password:", err);
  }
}

resetPassword();
