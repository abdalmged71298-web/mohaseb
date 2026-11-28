'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowRight, Search, MessageSquare, UserPlus, Check, Ban, Clock, Mail } from 'lucide-react';
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
  const [profileMember, setProfileMember] = useState<any | null>(null);
  const [friendStatus, setFriendStatus] = useState<any>(null);
  const [pendingIn, setPendingIn] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConvs = useCallback(async () => {
    const r = await fetch('/api/community/messages', { credentials: 'include' });
    const d = await r.json();
    setConvs(d.conversations || []);
    setLoading(false);
  }, []);

  const loadPending = useCallback(async () => {
    const r = await fetch('/api/community/friends', { credentials: 'include', cache: 'no-store' });
    const d = await r.json();
    setPendingIn(d.pendingIn || []);
  }, []);

  const loadFriendStatus = useCallback(async (toId: string) => {
    const r = await fetch(`/api/community/friends/status?toId=${toId}`, { credentials: 'include', cache: 'no-store' });
    const d = await r.json();
    setFriendStatus(d);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // Load pending friend requests on mount + refresh periodically
  useEffect(() => {
    loadPending();
    const t = setInterval(loadPending, 5000);
    return () => clearInterval(t);
  }, [loadPending]);

  // When a member profile card is opened, fetch friendship status
  useEffect(() => {
    if (profileMember) loadFriendStatus(profileMember.id);
    else setFriendStatus(null);
  }, [profileMember, loadFriendStatus]);

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
    // Poll every 1.5s as a fallback for real-time
    pollingRef.current = setInterval(loadMessages, 1500);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [active, loadMessages]);

  // Track whether the user is near the bottom (so we only auto-scroll when
  // they're already following the latest — never yank them away while reading
  // older messages).
  const nearBottomRef = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distFromBottom < 80;
  };

  // Keep track of the previous message count so we only scroll when a NEW
  // message actually arrives (not on every reload).
  const prevCountRef = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newCount = messages.length;
    // Only auto-scroll to bottom if the user is already near it AND a new
    // message arrived (count grew). Otherwise preserve their scroll position.
    if (nearBottomRef.current && newCount > prevCountRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevCountRef.current = newCount;
  }, [messages]);

  const searchMembers = async (q: string) => {
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const r = await fetch(`/api/community/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
    const d = await r.json();
    setSearchResults((d.members || []).filter((m: any) => m.id !== memberId));
  };

  const startConversation = async (toId: string) => {
    // Open a member card showing friendship status + actions (instead of
    // messaging directly — friendship is now a prerequisite for messaging).
    setSearching(false);
    setSearchQ('');
    const target = searchResults.find((m) => m.id === toId);
    if (target) setProfileMember(target);
    else {
      // fallback: fetch minimal info
      const r = await fetch(`/api/community/profile?id=${toId}`, { credentials: 'include' });
      const d = await r.json();
      if (d.profile) setProfileMember({ id: d.profile.id, displayName: d.profile.displayName, level: d.profile.level, avatarColor: d.profile.avatarColor });
    }
  };

  // Friendship actions
  const friendAction = async (action: string, toId: string) => {
    const r = await fetch('/api/community/friends', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, toId }),
    });
    const d = await r.json();
    if (r.ok) {
      toast.success(action === 'request' ? 'أُرسل طلب الصداقة' : action === 'accept' ? 'تمت قبول الصداقة' : action === 'decline' ? 'تم الرفض' : action === 'block' ? 'تم الحظر' : action === 'unblock' ? 'تم إلغاء الحظر/الصداقة' : 'تم');
      // Refresh status
      if (profileMember) loadFriendStatus(profileMember.id);
      loadPending();
      loadConvs();
    } else {
      toast.error(d.error || 'تعذر الإجراء');
    }
  };

  const send = async () => {
    if (!text.trim() || !active || !other) return;
    const content = text.trim();
    setText('');
    // Optimistic: append immediately, and force-scroll so the sender sees their message.
    const optimistic = { id: 'tmp-' + Date.now(), senderId: memberId, content, createdAt: new Date().toISOString(), sender: { id: memberId, displayName: memberName, avatarColor: '#7b2cbf' } };
    setMessages((m) => [...m, optimistic]);
    nearBottomRef.current = true;
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 30);
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

  if (profileMember && !active) {
    const st = friendStatus?.status || 'none';
    const dir = friendStatus?.direction;
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setProfileMember(null)}><ArrowRight className="size-4 rotate-180 ml-1" /> رجوع</Button>
        <Card className="p-5 text-center">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-xl font-bold mb-2" style={{ backgroundColor: profileMember.avatarColor }}>
            {profileMember.displayName.charAt(0)}
          </div>
          <h3 className="font-bold">{profileMember.displayName}</h3>
          <p className="text-xs text-muted-foreground">{profileMember.level}</p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {st === 'none' && (
              <>
                <Button size="sm" onClick={() => friendAction('request', profileMember.id)}><UserPlus className="size-4 ml-1" /> طلب صداقة</Button>
                <Button size="sm" variant="outline" onClick={() => friendAction('block', profileMember.id)} className="text-destructive"><Ban className="size-4 ml-1" /> حظر</Button>
              </>
            )}
            {st === 'pending' && dir === 'out' && (
              <>
                <Badge variant="secondary"><Clock className="size-3 ml-1" /> طلب مرسَل — بانتظار القبول</Badge>
                <Button size="sm" variant="outline" onClick={() => friendAction('cancel', profileMember.id)}>إلغاء الطلب</Button>
              </>
            )}
            {st === 'pending' && dir === 'in' && (
              <>
                <Button size="sm" onClick={() => friendAction('accept', profileMember.id)}><Check className="size-4 ml-1" /> قبول الصداقة</Button>
                <Button size="sm" variant="outline" onClick={() => friendAction('decline', profileMember.id)}>رفض</Button>
              </>
            )}
            {st === 'accepted' && (
              <>
                <Badge className="bg-emerald-500 text-white"><Check className="size-3 ml-1" /> أصدقاء</Badge>
                <Button size="sm" onClick={() => { const c = convs.find((x) => x.other.id === profileMember.id); if (c) setActive(c.id); else { /* create conv via first open */ } }}><Mail className="size-4 ml-1" /> فتح المحادثة</Button>
                <Button size="sm" variant="outline" onClick={() => friendAction('unblock', profileMember.id)}>إلغاء الصداقة</Button>
                <Button size="sm" variant="outline" onClick={() => friendAction('block', profileMember.id)} className="text-destructive"><Ban className="size-4 ml-1" /> حظر</Button>
              </>
            )}
            {st === 'blocked_by_me' && (
              <Button size="sm" variant="outline" onClick={() => friendAction('unblock', profileMember.id)}><Ban className="size-4 ml-1" /> إلغاء الحظر</Button>
            )}
            {st === 'blocked_me' && (
              <Badge variant="destructive"><Ban className="size-3 ml-1" /> هذا المستخدم حظرك</Badge>
            )}
            {st === 'declined' && (
              <Button size="sm" onClick={() => friendAction('request', profileMember.id)}><UserPlus className="size-4 ml-1" /> طلب صداقة مجدداً</Button>
            )}
          </div>
          {st !== 'accepted' && (
            <p className="text-[11px] text-muted-foreground mt-3">يمكنك مراسلة هذا الطالب بعد قبول الصداقة بينكما.</p>
          )}
        </Card>
      </div>
    );
  }

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
          <div ref={scrollRef} onScroll={onScroll} className="p-3 max-h-[55vh] overflow-y-auto scroll-thin space-y-2">
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

      {/* Pending friend requests (incoming) */}
      {pendingIn.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><UserPlus className="size-3.5" /> طلبات صداقة بانتظار الرد</p>
          <div className="space-y-1">
            {pendingIn.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: m.avatarColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{m.level}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => friendAction('decline', m.id)}>رفض</Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => friendAction('accept', m.id)}><Check className="size-3 ml-0.5" /> قبول</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : convs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
          لا توجد محادثات بعد. ابحث عن طالب وأرسل طلب صداقة لبدء المراسلة.
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
