import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/groups/[id] — group detail with members + recent messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const group = await db.group.findUnique({
    where: { id },
    include: {
      members: { include: { member: true }, orderBy: { joinedAt: 'asc' } },
      messages: { orderBy: { createdAt: 'asc' }, take: 100, include: { sender: true } },
    },
  });
  if (!group) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const isMember = group.members.some((m) => m.memberId === member.id);
  return NextResponse.json({ group, isMember });
}

// DELETE /api/community/groups/[id] — leave group
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  await db.groupMember.deleteMany({ where: { groupId: id, memberId: member.id } });
  return NextResponse.json({ ok: true });
}
