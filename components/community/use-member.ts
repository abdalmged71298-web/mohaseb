'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Member {
  id: string;
  displayName: string;
  level: string;
  avatarColor: string;
  bio: string;
  role: string;
}

/** Hook that manages the community identity (current member) on the client. */
export function useMember() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/community/member', { credentials: 'include' });
      const data = await res.json();
      setJoined(!!data.joined);
      setMember(data.member || null);
    } catch {
      setJoined(false);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const join = async (displayName: string, level: string, avatarColor: string) => {
    const res = await fetch('/api/community/member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName, level, avatarColor }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر الانضمام');
    setJoined(true);
    setMember(data.member);
    return data.member;
  };

  const updateProfile = async (patch: { displayName?: string; level?: string; bio?: string; avatarColor?: string }) => {
    const res = await fetch('/api/community/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر التحديث');
    setMember(data.member);
    return data.member;
  };

  return { member, loading, joined, refresh, join, updateProfile };
}

/** Singleton realtime socket. Connects to the mini-service on port 3003 via the gateway. */
let socket: Socket | null = null;
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    try {
      socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5 });
    } catch {
      socket = null;
    }
  }
  return socket;
}

/** Hook that returns online member ids (presence) from the realtime service. */
export function usePresence() {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onUp = (d: { memberId: string; online: boolean }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (d.online) next.add(d.memberId);
        else next.delete(d.memberId);
        return next;
      });
    };
    s.on('presence-update', onUp);
    return () => { s.off('presence-update', onUp); };
  }, []);
  return onlineIds;
}

// Real-time event names — kept in sync with src/lib/community/broadcast.ts EVENTS
export const RT_EVENTS = {
  POST_NEW: 'post:new',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  COMMENT_NEW: 'comment:new',
  LIKE_UPDATE: 'like:update',
  QUESTION_NEW: 'question:new',
  QUESTION_UPDATE: 'question:update',
  ANSWER_NEW: 'answer:new',
  ANSWER_UPDATE: 'answer:update',
  POLL_NEW: 'poll:new',
  POLL_VOTE: 'poll:vote',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
} as const;

/**
 * Subscribe to real-time forum events. Pass a map of event name → callback.
 * The socket is shared (singleton). Callbacks are cleaned up on unmount.
 */
export function useRealtimeEvents(handlers: Record<string, (payload: any) => void>, deps: any[] = []) {
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.connect();
    const entries = Object.entries(handlers);
    for (const [event, cb] of entries) s.on(event, cb);
    return () => {
      for (const [event, cb] of entries) s.off(event, cb);
    };
  }, deps);
}
