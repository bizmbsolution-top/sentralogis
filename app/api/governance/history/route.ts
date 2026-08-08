import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GovernanceTrendSnapshot } from '@/src/features/governance/types';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'governance', 'history', 'history.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No governance reports generated.' }, { status: 404 });
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const history: GovernanceTrendSnapshot[] = JSON.parse(data);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read repository history' }, { status: 500 });
  }
}
