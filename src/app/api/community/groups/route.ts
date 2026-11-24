import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/groups?category=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const where: any = {};
  if (category && category !== 'all') where.category = category;
  const groups = await db.group.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true } } },
  });
  const member = await getCurrentMember();
  const myMemberships = member
    ? (await db.groupMember.findMany({ where: { memberId: member.id }, select: { groupId: true } })).map((m) => m.groupId)
    : [];
  return NextResponse.json({
    groups: groups.map((g) => ({ ...g, joined: myMemberships.includes(g.id) })),
  });
}

// POST /api/community/groups — create a group
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (body?.name || '').toString().trim().slice(0, 80);
  const description = (body?.description || '').toString().slice(0, 300);
  const category = (body?.category || 'عام').toString().slice(0, 60);
  if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });

  const group = await db.group.create({
    data: {
      name,
      description,
      category,
      creatorId: member.id,
      members: { create: { memberId: member.id, role: 'admin' } },
    },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json({ group, joined: true });
}
