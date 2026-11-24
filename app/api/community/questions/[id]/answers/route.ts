import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// POST /api/community/questions/[id]/answers — add an answer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const content = (body?.content || '').toString().trim().slice(0, 5000);
  if (!content) return NextResponse.json({ error: 'المحتوى فارغ' }, { status: 400 });

  const question = await db.question.findUnique({ where: { id } });
  if (!question) return NextResponse.json({ error: 'السؤال غير موجود' }, { status: 404 });

  const answer = await db.answer.create({
    data: { questionId: id, authorId: member.id, content },
    include: { author: true, _count: { select: { likes: true } } },
  });

  // Update question status to "answered" and notify author
  let newStatus = question.status;
  if (question.status === 'open') {
    await db.question.update({ where: { id }, data: { status: 'answered' } });
    newStatus = 'answered';
  }
  if (question.authorId !== member.id) {
    const notif = await db.notification.create({
      data: {
        ownerId: question.authorId,
        triggerId: member.id,
        type: 'answer',
        title: 'إجابة جديدة على سؤالك',
        body: `${member.displayName} أجاب على «${question.title.slice(0, 40)}»`,
        link: `community://question/${id}`,
      },
    });
    await broadcast(EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: question.authorId });
  }
  await broadcast(EVENTS.ANSWER_NEW, { questionId: id, answer: { ...answer, liked: false }, status: newStatus });
  return NextResponse.json({ answer });
}
