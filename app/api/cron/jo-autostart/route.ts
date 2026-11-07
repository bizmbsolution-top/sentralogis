// Driver confirmation is the only event that moves an assigned JO into
// ON JOURNEY. Automatic start after a timer is intentionally disabled.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    autoStarted: 0,
    message: 'Auto-start dinonaktifkan. JO hanya masuk On Journey setelah driver menerima penugasan.',
  });
}
