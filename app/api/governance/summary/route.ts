import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GovernanceSnapshot } from '@/src/features/governance/types';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'governance', 'json', 'governance_snapshot.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No governance reports generated.' }, { status: 404 });
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const metrics: GovernanceSnapshot = JSON.parse(data);
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read repository metrics' }, { status: 500 });
  }
}
