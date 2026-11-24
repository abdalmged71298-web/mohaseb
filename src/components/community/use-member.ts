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
  // On external hosts (e.g. vercel.app) the internal WS service doesn't exist,
  // so skip connection attempts entirely and rely on fast API polling.
  if (!isLocalEnvironment()) return null;
  if (!socket) {
    try {
      socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5 });
    } catch {
      socket = null;
    }
  }
  return socket;
}

/**
 * Whether the app is running on a local/dev environment (where the internal
 * WebSocket service on port 3003 exists). On external hosts (e.g. vercel.app)
 * we skip WebSocket entirely and rely on fast API polling instead, to avoid
 * wasted browser resources on failed connection attempts.
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || /^192\.168\./.test(h) || /^10\./.test(h) || /^21\./.test(h);
}

/**
 * Polling hook that only runs while the page is visible (not hidden/tab in
 * background). Used for fast background refresh of forum sections on hosts
 * without WebSocket (e.g. Vercel serverless).
 */
export function useVisiblePolling(callback: () => void, intervalMs: number, deps: any[] = []) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(callback, intervalMs);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') { callback(); start(); }
      else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, deps);
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
