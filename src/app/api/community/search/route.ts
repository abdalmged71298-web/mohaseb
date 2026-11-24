import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/search?q=... — search members, posts, questions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ members: [], posts: [], questions: [] });

  const [members, posts, questions] = await Promise.all([
    db.communityMember.findMany({
      where: { displayName: { contains: q } },
      take: 8,
      select: { id: true, displayName: true, level: true, avatarColor: true },
    }),
    db.post.findMany({
      where: { title: { contains: q }, hidden: false },
      take: 8,
      select: { id: true, title: true, category: true, createdAt: true },
    }),
    db.question.findMany({
      where: { title: { contains: q } },
      take: 8,
      select: { id: true, title: true, subject: true, status: true },
    }),
  ]);

  const me = await getCurrentMember();
  return NextResponse.json({ members, posts, questions, myId: me?.id || null });
}
