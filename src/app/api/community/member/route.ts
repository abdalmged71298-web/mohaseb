import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember, createMember, getMemberId, COOKIE_NAME } from '@/lib/community/identity';

// GET /api/community/member — returns the current member, or { joined: false }
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ joined: false });
  }
  await db.communityMember.update({ where: { id: member.id }, data: { lastSeen: new Date() } });
  return NextResponse.json({ joined: true, member });
}

// POST /api/community/member — join (create identity)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const displayName = (body?.displayName || '').toString().trim().slice(0, 40);
  const level = (body?.level || 'غير محدد').toString().trim().slice(0, 40);
  const avatarColor = (body?.avatarColor || '#7b2cbf').toString().trim().slice(0, 9);

  if (!displayName) {
    return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
  }
  const existing = await getCurrentMember();
  if (existing) {
    return NextResponse.json({ joined: true, member: existing });
  }
  const taken = await db.communityMember.findUnique({ where: { displayName } });
  if (taken) {
    return NextResponse.json({ error: 'هذا الاسم مستخدم، اختر اسماً آخر' }, { status: 409 });
  }
  try {
    const member = await createMember(displayName, level, avatarColor);
    return NextResponse.json({ joined: true, member });
  } catch (err) {
    console.error('createMember error:', err);
    return NextResponse.json({ error: 'تعذر إنشاء الحساب' }, { status: 500 });
  }
}

// PATCH /api/community/member — update profile
export async function PATCH(req: NextRequest) {
  const id = await getMemberId();
  if (!id) {
    return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string> = {};
  if (body.displayName) {
    const name = body.displayName.toString().trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: 'الاسم فارغ' }, { status: 400 });
    const taken = await db.communityMember.findFirst({ where: { displayName: name, NOT: { id } } });
    if (taken) return NextResponse.json({ error: 'الاسم مستخدم' }, { status: 409 });
    data.displayName = name;
  }
  if (body.level) data.level = body.level.toString().trim().slice(0, 40);
  if (body.bio !== undefined) data.bio = body.bio.toString().slice(0, 300);
  if (body.avatarColor) data.avatarColor = body.avatarColor.toString().slice(0, 9);

  const member = await db.communityMember.update({ where: { id }, data });
  return NextResponse.json({ member });
}

// DELETE /api/community/member — cancel the account (deletes the member and all
// their data: posts, comments, questions, answers, messages, friendships, etc.)
// Clears the identity cookie.
export async function DELETE() {
  const id = await getMemberId();
  if (!id) {
    return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  }
  // Cascading deletes (configured in the Prisma schema) remove all related rows.
  await db.communityMember.delete({ where: { id } }).catch(() => {});
  const store = await cookies();
  store.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
