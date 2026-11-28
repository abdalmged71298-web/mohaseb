import { db } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * Identity layer for the student community.
 *
 * No passwords: a member is created the first time a student joins (sets a
 * display name + level). The member id is persisted in an httpOnly cookie so
 * the same browser keeps the same identity across sessions. When the project
 * is deployed with a shared database, different students become different
 * members automatically.
 */

const COOKIE_NAME = 'community_member_id';
export { COOKIE_NAME };

/** Returns the current member id from the cookie, or null. */
export async function getMemberId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  return id || null;
}

/** Returns the current CommunityMember record, or null if not joined. */
export async function getCurrentMember() {
  const id = await getMemberId();
  if (!id) return null;
  return db.communityMember.findUnique({ where: { id } });
}

/** Ensures a member exists; returns null if not joined. */
export async function requireMember() {
  return getCurrentMember();
}

/** Creates a new member and sets the cookie. Called by the join route. */
export async function createMember(displayName: string, level: string, avatarColor: string) {
  const member = await db.communityMember.create({
    data: { displayName, level, avatarColor },
  });
  const store = await cookies();
  store.set(COOKIE_NAME, member.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
  return member;
}

/** Updates lastSeen for the current member (best-effort). */
export async function touchPresence() {
  const id = await getMemberId();
  if (!id) return;
  try {
    await db.communityMember.update({ where: { id }, data: { lastSeen: new Date() } });
  } catch {
    // ignore
  }
}
