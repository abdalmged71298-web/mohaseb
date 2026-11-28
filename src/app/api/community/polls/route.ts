import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/polls?category=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const where: any = {};
  if (category && category !== 'all') where.category = category;
  const polls = await db.poll.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      creator: true,
      options: { include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  });
  const member = await getCurrentMember();
  const myVotes = member
    ? (await db.pollVote.findMany({ where: { memberId: member.id }, select: { pollId: true, optionId: true } }))
    : [];
  const votedMap = Object.fromEntries(myVotes.map((v) => [v.pollId, v.optionId]));
  return NextResponse.json({
    polls: polls.map((p) => ({ ...p, myVote: votedMap[p.id] || null })),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

// POST /api/community/polls — create a poll
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const question = (body?.question || '').toString().trim().slice(0, 200);
  const category = (body?.category || 'عام').toString().slice(0, 60);
  const options: string[] = Array.isArray(body?.options) ? body.options.map((o: any) => o.toString().trim().slice(0, 100)).filter(Boolean) : [];
  if (!question || options.length < 2) {
    return NextResponse.json({ error: 'السؤال وخياران على الأقل مطلوبان' }, { status: 400 });
  }
  const poll = await db.poll.create({
    data: {
      question,
      category,
      creatorId: member.id,
      options: { create: options.map((text) => ({ text })) },
    },
    include: {
      creator: true,
      options: { include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  });
  await broadcast(EVENTS.POLL_NEW, { poll: { ...poll, myVote: null } });
  return NextResponse.json({ poll });
}
