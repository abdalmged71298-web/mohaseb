import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// GET /api/community/posts?feed=all|unanswered|top&category=...&q=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const feed = searchParams.get('feed') || 'all';
  const category = searchParams.get('category') || '';
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50);

  const where: any = { hidden: false };
  if (category && category !== 'all') where.category = category;
  if (q) where.title = { contains: q };

  let orderBy: any = { createdAt: 'desc' };
  if (feed === 'top') {
    orderBy = { likes: { _count: 'desc' } };
  }

  const posts = await db.post.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      author: true,
      _count: { select: { comments: true, likes: true } },
    },
  });

  const member = await getCurrentMember();
  const likedIds = member
    ? (await db.postLike.findMany({ where: { memberId: member.id }, select: { postId: true } })).map((l) => l.postId)
    : [];

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      liked: likedIds.includes(p.id),
    })),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

// POST /api/community/posts — create a post
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: 'يجب الانضمام للمجتمع أولاً' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const title = (body?.title || '').toString().trim().slice(0, 120);
  const content = (body?.content || '').toString().trim().slice(0, 5000);
  const category = (body?.category || 'عام').toString().trim().slice(0, 60);

  if (!title || !content) {
    return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 });
  }

  const post = await db.post.create({
    data: { title, content, category, authorId: member.id },
    include: { author: true, _count: { select: { comments: true, likes: true } } },
  });
  // Real-time: notify all clients of the new post
  await broadcast(EVENTS.POST_NEW, { post: { ...post, liked: false } });
  return NextResponse.json({ post });
}
