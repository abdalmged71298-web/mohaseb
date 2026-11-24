import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// POST /api/community/groups/[id]/join
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const existing = await db.groupMember.findUnique({ where: { groupId_memberId: { groupId: id, memberId: member.id } } });
  if (existing) return NextResponse.json({ ok: true, joined: true });
  await db.groupMember.create({ data: { groupId: id, memberId: member.id } });
  return NextResponse.json({ ok: true, joined: true });
}
