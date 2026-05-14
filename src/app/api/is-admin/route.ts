import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ isAdmin: false });
  return NextResponse.json({ isAdmin: true });
}
