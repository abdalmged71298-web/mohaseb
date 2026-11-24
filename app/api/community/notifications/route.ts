import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcastToMember, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/notifications — list (unread first)
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const notifications = await db.notification.findMany({
    where: { ownerId: member.id },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 40,
    include: { trigger: true },
  });
  const unread = await db.notification.count({ where: { ownerId: member.id, read: false } });
  return NextResponse.json({ notifications, unread });
}

// PATCH /api/community/notifications — mark all (or one via ?id=) as read
export async function PATCH(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const one = searchParams.get('id');
  if (one) {
    await db.notification.updateMany({ where: { id: one, ownerId: member.id }, data: { read: true } });
    await broadcastToMember(member.id, EVENTS.NOTIFICATION_READ, { id: one, all: false });
  } else {
    await db.notification.updateMany({ where: { ownerId: member.id, read: false }, data: { read: true } });
    await broadcastToMember(member.id, EVENTS.NOTIFICATION_READ, { all: true });
  }
  const unread = await db.notification.count({ where: { ownerId: member.id, read: false } });
  return NextResponse.json({ ok: true, unread });
}
