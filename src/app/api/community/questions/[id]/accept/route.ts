import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// POST /api/community/questions/[id]/accept?answerId=...
// Only the question author (or mod/admin) can accept an answer.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const answerId = searchParams.get('answerId');
  if (!answerId) return NextResponse.json({ error: 'answerId مطلوب' }, { status: 400 });

  const question = await db.question.findUnique({ where: { id } });
  if (!question) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (question.authorId !== member.id && member.role === 'student') {
    return NextResponse.json({ error: 'فقط صاحب السؤال يحدد الإجابة المقبولة' }, { status: 403 });
  }

  const answer = await db.answer.findUnique({ where: { id: answerId } });
  if (!answer || answer.questionId !== id) {
    return NextResponse.json({ error: 'الإجابة غير تابعة لهذا السؤال' }, { status: 400 });
  }

  // Unset previous accepted, set new
  await db.answer.updateMany({ where: { questionId: id, accepted: true }, data: { accepted: false } });
  await db.answer.update({ where: { id: answerId }, data: { accepted: true } });
  await db.question.update({ where: { id }, data: { status: 'solved' } });

  // Notify the answer author
  if (answer.authorId !== member.id) {
    const notif = await db.notification.create({
      data: {
        ownerId: answer.authorId,
        triggerId: member.id,
        type: 'accepted',
        title: 'تم قبول إجابتك',
        body: `قبل ${member.displayName} إجابتك على «${question.title.slice(0, 40)}»`,
        link: `community://question/${id}`,
      },
    });
    await broadcast(EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: answer.authorId });
  }
  await broadcast(EVENTS.ANSWER_UPDATE, { questionId: id, acceptedAnswerId: answerId, status: 'solved' });
  await broadcast(EVENTS.QUESTION_UPDATE, { questionId: id, status: 'solved' });
  return NextResponse.json({ ok: true });
}
