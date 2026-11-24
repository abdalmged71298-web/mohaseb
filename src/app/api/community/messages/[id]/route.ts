import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/messages/[id] — conversation messages (only for participants)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { memberA: true, memberB: true },
  });
  if (!conv) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (conv.memberAId !== member.id && conv.memberBId !== member.id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }
  const messages = await db.directMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    include: { sender: true },
  });
  // Mark received as read
  await db.directMessage.updateMany({
    where: { conversationId: id, read: false, senderId: { not: member.id } },
    data: { read: true },
  });
  const other = conv.memberAId === member.id ? conv.memberB : conv.memberA;
  return NextResponse.json({ other, messages });
}
