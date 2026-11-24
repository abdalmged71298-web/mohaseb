import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';
import { broadcast, EVENTS } from '@/lib/community/broadcast';

// POST /api/community/posts/[id]/comments — add a comment (or reply)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'يجب الانضمام أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const content = (body?.content || '').toString().trim().slice(0, 2000);
  const parentId = body?.parentId ? body.parentId.toString() : null;
  if (!content) return NextResponse.json({ error: 'المحتوى فارغ' }, { status: 400 });

  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.hidden) return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });

  const comment = await db.comment.create({
    data: { postId: id, authorId: member.id, content, parentId },
    include: { author: true },
  });

  // Notify the post author (if not self)
  if (post.authorId !== member.id) {
    const notif = await db.notification.create({
      data: {
        ownerId: post.authorId,
        triggerId: member.id,
        type: 'comment',
        title: 'تعليق جديد على منشورك',
        body: `${member.displayName} علّق على «${post.title.slice(0, 40)}»`,
        link: `community://post/${id}`,
      },
    });
    await broadcast(EVENTS.NOTIFICATION_NEW, { notification: notif, toMemberId: post.authorId });
  }
  // Real-time: broadcast the new comment to all clients viewing this post
  await broadcast(EVENTS.COMMENT_NEW, { postId: id, comment });
  return NextResponse.json({ comment });
}
