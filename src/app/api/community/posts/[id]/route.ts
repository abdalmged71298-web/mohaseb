import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/posts/[id] — post detail with comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: true,
      comments: { orderBy: { createdAt: 'asc' }, include: { author: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });
  if (!post || post.hidden) {
    return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 });
  }
  // Increment views
  await db.post.update({ where: { id }, data: { views: { increment: 1 } } });

  const member = await getCurrentMember();
  const liked = member ? !!(await db.postLike.findUnique({ where: { postId_memberId: { postId: id, memberId: member.id } } })) : false;
  return NextResponse.json({ post: { ...post, liked } });
}

// PATCH /api/community/posts/[id] — edit own post
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (post.authorId !== member.id && member.role === 'student') {
    return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.title) data.title = body.title.toString().trim().slice(0, 120);
  if (body.content) data.content = body.content.toString().trim().slice(0, 5000);
  if (body.category) data.category = body.category.toString().slice(0, 60);
  if (typeof body.pinned === 'boolean' && (member.role === 'moderator' || member.role === 'admin')) data.pinned = body.pinned;
  if (typeof body.hidden === 'boolean' && (member.role === 'moderator' || member.role === 'admin')) data.hidden = body.hidden;
  const updated = await db.post.update({ where: { id }, data, include: { author: true, _count: { select: { comments: true, likes: true } } } });
  return NextResponse.json({ post: updated });
}

// DELETE /api/community/posts/[id] — delete own post (or mod/admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  if (post.authorId !== member.id && member.role === 'student') {
    return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
  }
  await db.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
