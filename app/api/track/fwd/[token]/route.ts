import { NextRequest, NextResponse } from 'next/server';
import { getForwardingTrackingByToken } from '@/lib/actions/forwardingActions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 400 });
    }

    const trimmed = token.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    const data = await getForwardingTrackingByToken(trimmed);

    if (!data) {
      return NextResponse.json({ error: 'Tracking tidak ditemukan atau token tidak valid.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[API] GET /api/track/fwd error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memuat data tracking.' }, { status: 500 });
  }
}
