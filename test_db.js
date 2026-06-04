const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

// Attempt to parse DB string from SUPABASE_URL if we have SUPABASE_DB_URL
// Wait, Sentralogis usually has NEXT_PUBLIC_SUPABASE_URL. Let's see if there's a connection string.
console.log(Object.keys(envConfig));
