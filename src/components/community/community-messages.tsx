'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowRight, Search, MessageSquare } from 'lucide-react';
import { getSocket } from './use-member';
import { toast } from 'sonner';

export function CommunityMessages({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConvs = useCallback(async () => {
    const r = await fetch('/api/community/messages', { credentials: 'include' });
    const d = await r.json();
    setConvs(d.conversations || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // WebSocket for real-time incoming messages
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.connect();
    s.emit('identify', { memberId });
    const onMsg = (msg: any) => {
      setMessages((m) => [...m, msg]);
      loadConvs();
    };
    s.on('private-message', onMsg);
    return () => { s.off('private-message', onMsg); };
  }, [memberId, loadConvs]);

  // Load + poll active conversation (fallback when WS is down)
  const loadMessages = useCallback(async () => {
    if (!active) return;
    const r = await fetch(`/api/community/messages/${active}`, { credentials: 'include' });
    const d = await r.json();
    setMessages(d.messages || []);
    setOther(d.other);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    loadMessages();
    // Poll every 4s as a fallback for real-time
    pollingRef.current = setInterval(loadMessages, 1500);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [active, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const searchMembers = async (q: string) => {
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const r = await fetch(`/api/community/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
    const d = await r.json();
    setSearchResults((d.members || []).filter((m: any) => m.id !== memberId));
  };

  const startConversation = async (toId: string) => {
    // Find existing conversation or create by sending first message placeholder via GET then POST
    // We'll just open: send a greeting message to create the conversation.
    setSearching(false);
    setSearchQ('');
    // Check existing
    const existing = convs.find((c) => c.other.id === toId);
    if (existing) { setActive(existing.id); return; }
    // Create by sending an intro message
    const r = await fetch(`/api/community/messages?to=${toId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'مرحباً، أردت التواصل معك عبر منتدى الطالب.' }),
    });
    const d = await r.json();
    if (r.ok) {
      loadConvs();
      setActive(d.conversationId);
      toast.success('بدأت المحادثة');
    } else { toast.error(d.error); }
  };

  const send = async () => {
    if (!text.trim() || !active || !other) return;
    const content = text.trim();
    setText('');
    // Optimistic: append immediately
    const optimistic = { id: 'tmp-' + Date.now(), senderId: memberId, content, createdAt: new Date().toISOString(), sender: { id: memberId, displayName: memberName, avatarColor: '#7b2cbf' } };
    setMessages((m) => [...m, optimistic]);
    const r = await fetch(`/api/community/messages?to=${other.id}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const d = await r.json();
    if (r.ok) {
      // Deliver via WS if online
      const s = getSocket();
      if (s) s.emit('private-message', { toMemberId: other.id, message: d.message });
      loadConvs();
    } else {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      toast.error('تعذر الإرسال');
    }
  };

  if (active) {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setActive(null)}><ArrowRight className="size-4 rotate-180 ml-1" /> المحادثات</Button>
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: other?.avatarColor }} />
            <span className="font-semibold text-sm">{other?.displayName}</span>
            <span className="text-[11px] text-muted-foreground">{other?.level}</span>
          </div>
          <div ref={scrollRef} className="p-3 max-h-[55vh] overflow-y-auto scroll-thin space-y-2">
            {messages.map((m) => {
              const mine = m.senderId === memberId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[9px] mt-0.5 ${mine ? 'opacity-70' : 'text-muted-foreground'}`}>{new Date(m.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">ابدأ المحادثة</p>}
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة..." onKeyDown={(e) => e.key === 'Enter' && send()} />
            <Button size="icon" onClick={send}><Send className="size-4" /></Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">المحادثات</h3>
        <Button size="sm" variant="outline" onClick={() => setSearching((s) => !s)}><Search className="size-4 ml-1" /> بحث عن طالب</Button>
      </div>

      {searching && (
        <Card className="p-3">
          <div className="relative mb-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={searchQ} onChange={(e) => searchMembers(e.target.value)} placeholder="ابحث عن اسم طالب..." className="pr-9" />
          </div>
          <div className="space-y-1">
            {searchResults.map((m) => (
              <button key={m.id} onClick={() => startConversation(m.id)} className="w-full text-right p-2 rounded-lg hover:bg-muted flex items-center gap-2">
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: m.avatarColor }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{m.level}</p>
                </div>
              </button>
            ))}
            {searchResults.length === 0 && searchQ.length >= 2 && <p className="text-xs text-muted-foreground text-center py-2">لا نتائج</p>}
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : convs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
          لا توجد محادثات بعد. ابحث عن طالب وابدأ محادثة.
        </Card>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className="w-full text-right card-hover">
              <Card className="p-3 hover:border-primary/40 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full shrink-0" style={{ backgroundColor: c.other?.avatarColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.other?.displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage?.content || 'لا رسائل'}</p>
                </div>
                {c.unread > 0 && <Badge className="bg-rose-500 text-white text-[10px]">{c.unread}</Badge>}
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
