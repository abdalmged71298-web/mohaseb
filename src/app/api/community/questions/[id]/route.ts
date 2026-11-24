import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/questions/[id] — detail with answers
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = await db.question.findUnique({
    where: { id },
    include: {
      author: true,
      answers: {
        orderBy: [{ accepted: 'desc' }, { createdAt: 'asc' }],
        include: {
          author: true,
          _count: { select: { likes: true } },
        },
      },
    },
  });
  if (!question) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const member = await getCurrentMember();
  const likedAnswerIds = member
    ? (await db.answerLike.findMany({ where: { memberId: member.id }, select: { answerId: true } })).map((l) => l.answerId)
    : [];
  return NextResponse.json({
    question,
    answers: question.answers.map((a) => ({ ...a, liked: likedAnswerIds.includes(a.id) })),
  });
}

// DELETE /api/community/questions/[id] — delete own question
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const q = await db.question.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (q.authorId !== member.id && member.role === 'student') {
    return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
  }
  await db.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
