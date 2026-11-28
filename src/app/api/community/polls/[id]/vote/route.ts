import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// POST /api/community/polls/[id]/vote?optionId=...
// One vote per member per poll (enforced by @@unique).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const optionId = searchParams.get('optionId');
  if (!optionId) return NextResponse.json({ error: 'optionId مطلوب' }, { status: 400 });

  const option = await db.pollOption.findUnique({ where: { id: optionId } });
  if (!option || option.pollId !== id) {
    return NextResponse.json({ error: 'الخيار غير تابع للاستطلاع' }, { status: 400 });
  }

  // Check if already voted
  const existing = await db.pollVote.findUnique({ where: { pollId_memberId: { pollId: id, memberId: member.id } } });
  if (existing) {
    // Change vote: delete old, create new
    await db.pollVote.delete({ where: { id: existing.id } });
  }
  await db.pollVote.create({ data: { pollId: id, optionId, memberId: member.id } });

  const poll = await db.poll.findUnique({
    where: { id },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  });
  // Real-time: broadcast updated vote counts to all clients
  await broadcast(EVENTS.POLL_VOTE, { pollId: id, poll, voterId: member.id });
  return NextResponse.json({ poll, myVote: optionId });
}
