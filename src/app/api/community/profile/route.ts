import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/community/profile?id=... — public profile with contribution stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });
  const member = await db.communityMember.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

  const [posts, questions, answers, acceptedAnswers, bestAnswersCount] = await Promise.all([
    db.post.count({ where: { authorId: id, hidden: false } }),
    db.question.count({ where: { authorId: id } }),
    db.answer.count({ where: { authorId: id } }),
    db.answer.findMany({ where: { authorId: id, accepted: true }, select: { id: true } }),
    db.answer.count({ where: { authorId: id, accepted: true } }),
  ]);

  // Simple contribution score: posts + 2*answers + 5*accepted
  const score = posts + questions + answers * 2 + bestAnswersCount * 5;

  // Badges
  const badges: string[] = [];
  if (bestAnswersCount >= 1) badges.push('best-answer');
  if (answers >= 10) badges.push('helper');
  if (posts + questions >= 20) badges.push('active');
  if (score >= 50) badges.push('top');

  return NextResponse.json({
    profile: {
      id: member.id,
      displayName: member.displayName,
      level: member.level,
      avatarColor: member.avatarColor,
      bio: member.bio,
      role: member.role,
      createdAt: member.createdAt,
      stats: { posts, questions, answers, acceptedAnswers: bestAnswersCount, score },
      badges,
    },
  });
}
