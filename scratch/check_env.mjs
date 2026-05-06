console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING');
console.log('Length of Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
