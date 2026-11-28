import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/questions?status=open|answered|solved&subject=...&q=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const subject = searchParams.get('subject') || '';
  const q = (searchParams.get('q') || '').trim();
  const mine = searchParams.get('mine') === '1';
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50);

  const where: any = {};
  if (status) where.status = status;
  if (subject && subject !== 'all') where.subject = subject;
  if (q) where.title = { contains: q };

  const member = await getCurrentMember();
  if (mine && member) where.authorId = member.id;

  const questions = await db.question.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: true,
      _count: { select: { answers: true } },
    },
  });
  return NextResponse.json({ questions }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

// POST /api/community/questions — create a question
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = (body?.title || '').toString().trim().slice(0, 150);
  const content = (body?.content || '').toString().trim().slice(0, 5000);
  const subject = (body?.subject || 'عام').toString().trim().slice(0, 60);
  if (!title) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });

  const question = await db.question.create({
    data: { title, content, subject, authorId: member.id },
    include: { author: true, _count: { select: { answers: true } } },
  });
  await broadcast(EVENTS.QUESTION_NEW, { question });
  return NextResponse.json({ question });
}
