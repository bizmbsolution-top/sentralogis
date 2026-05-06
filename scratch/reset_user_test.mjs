import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function resetUserById(userId) {
  console.log(`[ADMIN_TASK] Tracking UUID: ${userId}...`);
  
  try {
    // 1. Cek keberadaan user
    const { data: { user }, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getError || !user) {
      console.error('❌ User tidak ditemukan di sistem Auth.');
      return;
    }

    console.log(`✅ User ditemukan: ${user.email}`);

    // 2. Eksekusi Reset Password
    const newPass = 'PASSWORD_BARU_2024';
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPass
    });

    if (updateError) {
      console.error('❌ Gagal mengupdate password:', updateError.message);
    } else {
      console.log(`🚀 SUCCESS! Password untuk ${user.email} telah direset menjadi: ${newPass}`);
    }

  } catch (err) {
    console.error('CRITICAL ERROR:', err.message);
  }
}

resetUserById('4cfaa5d8-05eb-4ea7-b863-6a521bfd4eec');
