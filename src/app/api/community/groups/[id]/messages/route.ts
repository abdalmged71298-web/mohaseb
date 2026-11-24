import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// POST /api/community/groups/[id]/messages — send a group message (members only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const membership = await db.groupMember.findUnique({ where: { groupId_memberId: { groupId: id, memberId: member.id } } });
  if (!membership) return NextResponse.json({ error: 'لست عضواً في هذه المجموعة' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const content = (body?.content || '').toString().trim().slice(0, 3000);
  if (!content) return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
  const msg = await db.groupMessage.create({
    data: { groupId: id, senderId: member.id, content },
    include: { sender: true },
  });
  return NextResponse.json({ message: msg });
}
