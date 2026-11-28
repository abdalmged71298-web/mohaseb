'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowRight, Users, Send, LogOut } from 'lucide-react';
import { allSubjects } from '@/lib/platform-data';
import { getSocket } from './use-member';
import { toast } from 'sonner';

const CATS = ['عام', ...allSubjects.map((s) => s.title).slice(0, 20)];

export function CommunityGroups({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const params = category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    const r = await fetch(`/api/community/groups${params}`, { credentials: 'include' });
    const d = await r.json();
    setGroups(d.groups || []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return <GroupDetail id={selected} memberId={memberId} memberName={memberName} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">المجموعات الدراسية</h3>
        <Button size="sm" onClick={() => setCreating((c) => !c)}><Plus className="size-4 ml-1" /> مجموعة جديدة</Button>
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 25)}</SelectItem>)}</SelectContent>
      </Select>

      {creating && <CreateGroup onCreated={() => { setCreating(false); load(); }} />}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا توجد مجموعات. أنشئ أول مجموعة!</Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <button key={g.id} onClick={() => setSelected(g.id)} className="w-full text-right card-hover">
              <Card className="p-3 hover:border-primary/40 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="size-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{g.description || g.category}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{g._count?.members || 0} عضو</Badge>
                  {g.joined && <Badge className="text-[10px] bg-emerald-500 text-white">عضو</Badge>}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateGroup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('عام');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) { toast.error('الاسم مطلوب'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/community/groups', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, category }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('أُنشئت المجموعة');
      onCreated();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">مجموعة جديدة</p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المجموعة" maxLength={80} />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المجموعة..." rows={2} />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 25)}</SelectItem>)}</SelectContent>
      </Select>
      <Button onClick={submit} disabled={busy} size="sm">{busy ? 'جارٍ الإنشاء...' : 'إنشاء'}</Button>
    </Card>
  );
}

function GroupDetail({ id, memberId, memberName, onBack }: { id: string; memberId: string; memberName: string; onBack: () => void }) {
  const [data, setData] = useState<{ group: any; isMember: boolean } | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/community/groups/${id}`, { credentials: 'include' });
    const d = await r.json();
    setData({ group: d.group, isMember: d.isMember });
    setMessages(d.group?.messages || []);
  }, [id]);

  useEffect(() => {
    load();
    pollingRef.current = setInterval(load, 1500);
    const s = getSocket();
    if (s) { s.connect(); s.emit('join-group-room', id); s.on('group-message', (msg: any) => setMessages((m) => [...m, msg])); }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); const s2 = getSocket(); if (s2) { s2.off('group-message'); s2.emit('leave-group-room', id); } };
  }, [id, load]);

  // Only auto-scroll to bottom when the user is already near it AND a new
  // message arrives — never yank them up while reading older messages.
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const n = messages.length;
    if (nearBottomRef.current && n > prevCountRef.current) el.scrollTop = el.scrollHeight;
    prevCountRef.current = n;
  }, [messages]);

  const join = async () => {
    const r = await fetch(`/api/community/groups/${id}/join`, { method: 'POST', credentials: 'include' });
    if (r.ok) { toast.success('انضممت للمجموعة'); load(); }
  };
  const leave = async () => {
    if (!confirm('مغادرة المجموعة؟')) return;
    const r = await fetch(`/api/community/groups/${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { toast.success('غادرت المجموعة'); onBack(); }
  };
  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    const optimistic = { id: 'tmp-' + Date.now(), senderId: memberId, content, createdAt: new Date().toISOString(), sender: { id: memberId, displayName: memberName, avatarColor: '#7b2cbf' } };
    setMessages((m) => [...m, optimistic]);
    nearBottomRef.current = true;
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 30);
    const r = await fetch(`/api/community/groups/${id}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    const d = await r.json();
    if (r.ok) { const s = getSocket(); if (s) s.emit('group-message', { groupId: id, message: d.message }); }
    else { setMessages((m) => m.filter((x) => x.id !== optimistic.id)); toast.error('تعذر الإرسال'); }
  };

  if (!data) return <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>;
  const { group, isMember } = data;

  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowRight className="size-4 rotate-180 ml-1" /> المجموعات</Button>
      <Card className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-bold">{group.name}</h2>
            {group.description && <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>}
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px]">{group.category}</Badge>
              <span className="text-[11px] text-muted-foreground">{group.members?.length || 0} عضو</span>
            </div>
          </div>
          {isMember ? <Button size="sm" variant="outline" onClick={leave}><LogOut className="size-3.5 ml-1" /> مغادرة</Button> : <Button size="sm" onClick={join}>انضمام</Button>}
        </div>
      </Card>

      {isMember ? (
        <Card className="p-0 overflow-hidden">
          <div ref={scrollRef} onScroll={onScroll} className="p-3 max-h-[50vh] overflow-y-auto scroll-thin space-y-2">
            {messages.map((m) => {
              const mine = m.senderId === memberId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    {!mine && <p className="text-[10px] font-semibold mb-0.5" style={{ color: m.sender?.avatarColor }}>{m.sender?.displayName}</p>}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[9px] mt-0.5 ${mine ? 'opacity-70' : 'text-muted-foreground'}`}>{new Date(m.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">لا رسائل بعد</p>}
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="رسالة للمجموعة..." onKeyDown={(e) => e.key === 'Enter' && send()} />
            <Button size="icon" onClick={send}><Send className="size-4" /></Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">انضم للمجموعة للمشاركة في المحادثة.</Card>
      )}

      {/* Members list */}
      <Card className="p-3">
        <p className="font-semibold text-xs mb-2">الأعضاء</p>
        <div className="flex flex-wrap gap-2">
          {(group.members || []).map((m: any) => (
            <div key={m.id} className="flex items-center gap-1.5 text-xs">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: m.member?.avatarColor }} />
              <span>{m.member?.displayName}</span>
              {m.role === 'admin' && <Badge variant="outline" className="text-[9px]">مشرف</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
