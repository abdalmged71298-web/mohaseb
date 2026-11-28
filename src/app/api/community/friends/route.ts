import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcastToMember, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/friends — list friends, pending-out, pending-in, blocked
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });

  const [outgoing, incoming] = await Promise.all([
    db.friendship.findMany({ where: { requesterId: member.id }, include: { addressee: true } }),
    db.friendship.findMany({ where: { addresseeId: member.id }, include: { requester: true } }),
  ]);

  const friends: any[] = [];
  const pendingOut: any[] = [];
  const pendingIn: any[] = [];
  const blocked: any[] = [];

  for (const f of outgoing) {
    const other = f.addressee;
    if (f.status === 'accepted') friends.push(other);
    else if (f.status === 'pending') pendingOut.push(other);
    else if (f.status === 'blocked') blocked.push(other);
  }
  for (const f of incoming) {
    const other = f.requester;
    if (f.status === 'accepted') {
      if (!friends.some((m) => m.id === other.id)) friends.push(other);
    } else if (f.status === 'pending') {
      pendingIn.push(other);
    }
    // incoming 'blocked' means someone blocked us — don't list them
  }

  return NextResponse.json({ friends, pendingOut, pendingIn, blocked }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/community/friends — body: { action: 'request'|'accept'|'decline'|'block'|'unblock'|'cancel', toId }
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const toId = body?.toId;
  if (!action || !toId) return NextResponse.json({ error: 'action و toId مطلوبان' }, { status: 400 });
  if (toId === member.id) return NextResponse.json({ error: 'لا يمكن إجراء ذلك على نفسك' }, { status: 400 });

  const target = await db.communityMember.findUnique({ where: { id: toId } });
  if (!target) return NextResponse.json({ error: 'العضو غير موجود' }, { status: 404 });

  // Canonical row: requester = smaller id, addressee = larger id, EXCEPT for
  // block where the blocker is always the requester (directional).
  const [aId, bId] = [member.id, toId].sort();
  const meIsA = member.id === aId;

  // Check if the target blocked me — if so, disallow friend requests.
  const theyBlockedMe = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: toId, addresseeId: member.id } },
  });
  if (theyBlockedMe?.status === 'blocked' && action !== 'unblock') {
    return NextResponse.json({ error: 'لا يمكنك التواصل مع هذا المستخدم' }, { status: 403 });
  }

  if (action === 'block') {
    // Block is directional: blocker = me, blocked = them. Upsert a row with me as requester.
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: member.id, addresseeId: toId } },
      update: { status: 'blocked' },
      create: { requesterId: member.id, addresseeId: toId, status: 'blocked' },
    });
    return NextResponse.json({ ok: true, status: 'blocked' });
  }

  // For non-block actions, use the canonical row.
  const existing = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: aId, addresseeId: bId } },
  });

  if (action === 'request') {
    if (existing?.status === 'accepted') return NextResponse.json({ ok: true, status: 'accepted' });
    if (existing?.status === 'blocked') return NextResponse.json({ error: 'لا يمكن إرسال طلب' }, { status: 400 });
    await db.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: aId, addresseeId: bId } },
      update: { status: 'pending' },
      create: { requesterId: aId, addresseeId: bId, status: 'pending' },
    });
    // Notify the addressee
    const notif = await db.notification.create({
      data: {
        ownerId: toId, triggerId: member.id, type: 'friend_request',
        title: 'طلب صداقة جديد',
        body: `${member.displayName} يريد أن يصبح صديقك`,
        link: 'community://friends',
      },
    });
    await broadcastToMember(toId, EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: toId });
    return NextResponse.json({ ok: true, status: 'pending' });
  }

  if (action === 'accept') {
    // Only the addressee of the pending request can accept.
    if (!existing || existing.status !== 'pending') {
      return NextResponse.json({ error: 'لا يوجد طلب صداقة معلق' }, { status: 400 });
    }
    // The addressee of the canonical row is bId. If I'm bId, I can accept.
    const iAmAddressee = member.id === bId;
    if (!iAmAddressee) return NextResponse.json({ error: 'لا يمكنك قبول طلبك' }, { status: 400 });
    await db.friendship.update({ where: { id: existing.id }, data: { status: 'accepted' } });
    // Notify the requester
    const notif = await db.notification.create({
      data: {
        ownerId: aId, triggerId: member.id, type: 'friend_accepted',
        title: 'تم قبول طلب الصداقة',
        body: `${member.displayName} قبِل طلب صداقتك. يمكنكم الآن المراسلة.`,
        link: 'community://chat',
      },
    });
    await broadcastToMember(aId, EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: aId });
    return NextResponse.json({ ok: true, status: 'accepted' });
  }

  if (action === 'decline') {
    if (existing?.status === 'pending') {
      await db.friendship.update({ where: { id: existing.id }, data: { status: 'declined' } });
    }
    return NextResponse.json({ ok: true, status: 'declined' });
  }

  if (action === 'cancel') {
    // Cancel a pending request I sent.
    if (existing?.status === 'pending') {
      await db.friendship.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true, status: 'none' });
  }

  if (action === 'unblock') {
    // Remove a block I set (directional row: me as requester).
    await db.friendship.deleteMany({ where: { requesterId: member.id, addresseeId: toId, status: 'blocked' } });
    // Also if we were friends and I want to unfriend, remove the canonical row.
    if (existing?.status === 'accepted') {
      await db.friendship.delete({ where: { id: existing.id } }).catch(() => {});
    }
    return NextResponse.json({ ok: true, status: 'none' });
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
}
