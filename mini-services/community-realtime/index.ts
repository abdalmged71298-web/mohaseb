import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';

// Real-time transport for the student forum.
// Handles: private messages, group messages, typing, presence, AND
// broadcast events for feed updates (posts, questions, polls, notifications).
// Messages are ALSO persisted by the Next.js API routes, so even if this
// service is down, the polling fallback in the UI keeps messages flowing
// (just not instantly). This makes the system resilient.

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Internal emit endpoint: Next.js API routes POST here to broadcast an
  // event to all connected clients (or a specific member).
  if (req.method === 'POST' && req.url === '/api/emit') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { event, payload, toMemberId } = JSON.parse(body);
        if (toMemberId) {
          emitToMember(toMemberId, event, payload);
        } else {
          io.emit(event, payload);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad request' }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// member id -> socket ids
const onlineMembers = new Map<string, Set<string>>();
// socket id -> member id
const socketMember = new Map<string, string>();

function emitToMember(memberId: string, event: string, payload: any) {
  const sockets = onlineMembers.get(memberId);
  if (!sockets) return;
  for (const sid of sockets) io.to(sid).emit(event, payload);
}

io.on('connection', (socket) => {
  // Server-side broadcast: Next.js API routes connect as a client and emit
  // 'broadcast' to fan out an event to all connected browser clients.
  socket.on('broadcast', (data: { event: string; payload: any; toMemberId?: string }) => {
    if (data.toMemberId) {
      emitToMember(data.toMemberId, data.event, data.payload);
    } else {
      io.emit(data.event, data.payload);
    }
  });

  socket.on('identify', (data: { memberId?: string }) => {
    const memberId = data?.memberId;
    if (!memberId) return;
    socketMember.set(socket.id, memberId);
    if (!onlineMembers.has(memberId)) onlineMembers.set(memberId, new Set());
    onlineMembers.get(memberId)!.add(socket.id);
    // Broadcast presence
    io.emit('presence-update', {
      memberId,
      online: true,
      count: onlineMembers.size,
    });
  });

  // Private message: deliver to recipient if online
  socket.on('private-message', (data: { toMemberId: string; message: any }) => {
    emitToMember(data.toMemberId, 'private-message', data.message);
  });

  // Group message: deliver to all group members subscribed
  // (The client subscribes to a group room on join.)
  socket.on('group-message', (data: { groupId: string; message: any }) => {
    socket.to(`group:${data.groupId}`).emit('group-message', data.message);
  });

  socket.on('join-group-room', (groupId: string) => {
    socket.join(`group:${groupId}`);
  });
  socket.on('leave-group-room', (groupId: string) => {
    socket.leave(`group:${groupId}`);
  });

  socket.on('typing', (data: { toMemberId?: string; groupId?: string; name: string }) => {
    if (data.toMemberId) emitToMember(data.toMemberId, 'typing', { name: data.name });
    if (data.groupId) socket.to(`group:${data.groupId}`).emit('typing', { name: data.name });
  });

  socket.on('disconnect', () => {
    const memberId = socketMember.get(socket.id);
    if (memberId) {
      const sockets = onlineMembers.get(memberId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineMembers.delete(memberId);
          io.emit('presence-update', { memberId, online: false, count: onlineMembers.size });
        }
      }
    }
    socketMember.delete(socket.id);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`Community realtime service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0));
});
