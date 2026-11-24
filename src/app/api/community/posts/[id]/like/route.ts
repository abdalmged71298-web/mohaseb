import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// POST /api/community/posts/[id]/like — toggle like
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });

  const existing = await db.postLike.findUnique({
    where: { postId_memberId: { postId: id, memberId: member.id } },
  });
  let liked: boolean;
  if (existing) {
    await db.postLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await db.postLike.create({ data: { postId: id, memberId: member.id } });
    liked = true;
    const post = await db.post.findUnique({ where: { id }, select: { authorId: true, title: true } });
    if (post && post.authorId !== member.id) {
      const notif = await db.notification.create({
        data: {
          ownerId: post.authorId,
          triggerId: member.id,
          type: 'like',
          title: 'إعجاب بمنشورك',
          body: `${member.displayName} أعجب بمنشورك «${post.title.slice(0, 40)}»`,
          link: `community://post/${id}`,
        },
      });
      await broadcast(EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: post.authorId });
    }
  }
  const count = await db.postLike.count({ where: { postId: id } });
  await broadcast(EVENTS.LIKE_UPDATE, { postId: id, liked, count, memberId: member.id });
  return NextResponse.json({ liked, count });
}
