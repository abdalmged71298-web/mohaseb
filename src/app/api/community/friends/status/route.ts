import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentMember } from '@/lib/community/identity';

// GET /api/community/friends/status?toId=... — returns the relationship status
// between the current member and the target, plus a `canMessage` flag.
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'غير مشترك' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const toId = searchParams.get('toId');
  if (!toId) return NextResponse.json({ error: 'toId مطلوب' }, { status: 400 });

  // Check both directions
  const out = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: member.id, addresseeId: toId } },
  });
  const inc = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: toId, addresseeId: member.id } },
  });

  let status = 'none';
  let direction: 'none' | 'out' | 'in' = 'none';

  if (out?.status === 'blocked') {
    status = 'blocked_by_me';
  } else if (inc?.status === 'blocked') {
    status = 'blocked_me';
  } else if (out?.status === 'accepted' || inc?.status === 'accepted') {
    status = 'accepted';
  } else if (out?.status === 'pending') {
    status = 'pending'; direction = 'out';
  } else if (inc?.status === 'pending') {
    status = 'pending'; direction = 'in';
  } else if (out?.status === 'declined' || inc?.status === 'declined') {
    status = 'declined';
  }

  const canMessage = status === 'accepted';

  return NextResponse.json({ status, direction, canMessage }, { headers: { 'Cache-Control': 'no-store' } });
}
