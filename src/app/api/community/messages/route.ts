import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, broadcastToMember, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/messages — list current member's conversations
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });

  const conversations = await db.conversation.findMany({
    where: { OR: [{ memberAId: member.id }, { memberBId: member.id }] },
    orderBy: { updatedAt: 'desc' },
    include: {
      memberA: true,
      memberB: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // Count unread
  const result = await Promise.all(
    conversations.map(async (c) => {
      const unread = await db.directMessage.count({
        where: { conversationId: c.id, read: false, senderId: { not: member.id } },
      });
      const other = c.memberAId === member.id ? c.memberB : c.memberA;
      return {
        id: c.id,
        other,
        lastMessage: c.messages[0] || null,
        unread,
        updatedAt: c.updatedAt,
      };
    })
  );
  return NextResponse.json({ conversations: result });
}

// POST /api/community/messages?to=memberId — start/continue a conversation and send a message
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const toId = searchParams.get('to');
  if (!toId) return NextResponse.json({ error: 'to مطلوب' }, { status: 400 });
  if (toId === member.id) return NextResponse.json({ error: 'لا يمكن مراسلة نفسك' }, { status: 400 });

  const target = await db.communityMember.findUnique({ where: { id: toId } });
  if (!target) return NextResponse.json({ error: 'العضو غير موجود' }, { status: 404 });

  // Friendship enforcement: messaging requires an accepted friendship.
  const [aId0, bId0] = [member.id, toId].sort();
  const rel = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: aId0, addresseeId: bId0 } },
  });
  // Also check if either side blocked the other.
  const theyBlocked = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: toId, addresseeId: member.id } },
  });
  if (theyBlocked?.status === 'blocked') {
    return NextResponse.json({ error: 'لا يمكنك مراسلة هذا المستخدم' }, { status: 403 });
  }
  if (rel?.status !== 'accepted') {
    return NextResponse.json({ error: 'يجب أن تكونا أصدقاء أولاً لتبادل الرسائل. أرسل طلب صداقة.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const content = (body?.content || '').toString().trim().slice(0, 3000);
  if (!content) return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });

  // Find or create conversation (canonical order: A = smaller id)
  const [aId, bId] = [member.id, toId].sort();
  let conv = await db.conversation.findUnique({
    where: { memberAId_memberBId: { memberAId: aId, memberBId: bId } },
  });
  if (!conv) {
    conv = await db.conversation.create({ data: { memberAId: aId, memberBId: bId } });
  }

  const msg = await db.directMessage.create({
    data: { conversationId: conv.id, senderId: member.id, content },
  });
  await db.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });

  // Notify recipient
  const notif = await db.notification.create({
    data: {
      ownerId: toId,
      triggerId: member.id,
      type: 'message',
      title: 'رسالة جديدة',
      body: `${member.displayName}: ${content.slice(0, 60)}`,
      link: `community://chat/${conv.id}`,
    },
  });

  // Real-time: deliver message + notification to recipient if online
  await broadcastToMember(toId, EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: toId });

  return NextResponse.json({ conversationId: conv.id, message: msg });
}
