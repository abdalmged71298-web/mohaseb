// Server-side broadcast helper.
// Next.js API routes call this after a DB mutation to push the update to all
// connected browser clients in real-time via the WebSocket mini-service.
//
// The Next.js server connects to the WS service (port 3003) as a socket.io
// client and emits a 'broadcast' event, which the WS service fans out to all
// browser clients. This avoids the HTTP emit endpoint (socket.io intercepts
// all paths when path:'/' is set).
//
// This is best-effort: if the WS service is down, the call fails silently and
// the client polling/refresh fallback still works.

import { io as ioc, Socket } from 'socket.io-client';

const WS_URL = process.env.WS_INTERNAL_URL || 'http://localhost:3003';
// On Vercel serverless there is no internal WebSocket service — skip attempts.
const DISABLED = process.env.VERCEL === '1' || process.env.DISABLE_REALTIME === '1';

let serverSocket: Socket | null = null;
let connecting = false;

function getServerSocket(): Socket | null {
  if (DISABLED) return null;
  if (serverSocket && serverSocket.connected) return serverSocket;
  if (connecting) return null;
  connecting = true;
  try {
    serverSocket = ioc(WS_URL, {
      path: '/',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 2000,
    });
    serverSocket.on('connect', () => { connecting = false; });
    serverSocket.on('connect_error', () => { connecting = false; });
  } catch {
    connecting = false;
  }
  return serverSocket;
}

// Initialize the connection eagerly on first import (best-effort, local only).
if (!DISABLED) getServerSocket();

export async function broadcast(event: string, payload: any): Promise<void> {
  if (DISABLED) return;
  const s = getServerSocket();
  if (!s) return;
  try {
    if (s.connected) {
      s.emit('broadcast', { event, payload });
    } else {
      // If not connected yet, wait briefly for reconnection then emit
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 1500);
        s.once('connect', () => { clearTimeout(t); s.emit('broadcast', { event, payload }); resolve(); });
      });
    }
  } catch {
    // ignore — clients will see updates on next polling refresh
  }
}

export async function broadcastToMember(memberId: string, event: string, payload: any): Promise<void> {
  if (DISABLED) return;
  const s = getServerSocket();
  if (!s) return;
  try {
    if (s.connected) {
      s.emit('broadcast', { event, payload, toMemberId: memberId });
    }
  } catch {
    // ignore
  }
}

// Event name constants — keep in sync with the client subscriptions.
export const EVENTS = {
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
