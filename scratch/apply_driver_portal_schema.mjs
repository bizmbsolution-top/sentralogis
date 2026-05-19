import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables manually from .env.local
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (err) {
  console.warn('Could not read .env.local file');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Reading migration file...');
  const sqlPath = path.resolve('driver_portal_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration via exec_sql_manual (sequential statements)...');
  
  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql_manual', { sql_query: statement });
    if (error) {
      console.error('Error in statement:', statement);
      console.error('Error detail:', error);
      // Continue or abort? Let's abort on error
      process.exit(1);
    }
  }

  console.log('Migration applied successfully!');
}

applyMigration();
