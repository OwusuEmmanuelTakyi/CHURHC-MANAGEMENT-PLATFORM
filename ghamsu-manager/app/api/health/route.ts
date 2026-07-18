// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';

export async function GET() {
  const { error } = await db.from('locals').select('id').limit(1);
  return NextResponse.json({
    ok: !error,
    db: error ? error.message : 'connected',
    time: new Date().toISOString(),
  });
}