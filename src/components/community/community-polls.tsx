'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BarChart3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtimeEvents, RT_EVENTS, useVisiblePolling } from './use-member';

export function CommunityPolls({ memberId }: { memberId: string }) {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const params = category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    const r = await fetch(`/api/community/polls${params}`, { credentials: 'include' });
    const d = await r.json();
    setPolls(d.polls || []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  // Background polling: refresh polls every 5s while the tab is visible.
  useVisiblePolling(load, 5000, [load]);

  // Real-time: new poll → prepend (dedup); vote → update counts live
  useRealtimeEvents({
    [RT_EVENTS.POLL_NEW]: (payload: any) => {
      setPolls((prev) => {
        if (prev.some((p) => p.id === payload.poll.id)) return prev;
        return [payload.poll, ...prev];
      });
    },
    [RT_EVENTS.POLL_VOTE]: (payload: any) => {
      setPolls((prev) => prev.map((p) => p.id === payload.pollId ? { ...payload.poll, creator: p.creator, myVote: p.myVote } : p));
    },
  }, []);

  const vote = async (pollId: string, optionId: string) => {
    const r = await fetch(`/api/community/polls/${pollId}/vote?optionId=${optionId}`, { method: 'POST', credentials: 'include' });
    const d = await r.json();
    if (r.ok) {
      setPolls((ps) => ps.map((p) => p.id === pollId ? { ...d.poll, myVote: optionId, creator: p.creator } : p));
    } else { toast.error('تعذر التصويت'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">الاستطلاعات</h3>
        <Button size="sm" onClick={() => setCreating((c) => !c)}><Plus className="size-4 ml-1" /> استطلاع جديد</Button>
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          {['عام', 'محاسبة', 'مذاكرة', 'اختبارات'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      {creating && <CreatePoll onCreated={() => { setCreating(false); load(); }} />}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : polls.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا استطلاعات. أنشئ أول استطلاع!</Card>
      ) : (
        <div className="space-y-2">
          {polls.map((p) => {
            const totalVotes = p._count?.votes || 0;
            const myVote = p.myVote;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="size-4 text-primary" />
                  <p className="font-semibold text-sm flex-1">{p.question}</p>
                  <Badge variant="secondary" className="text-[10px]">{totalVotes} صوت</Badge>
                </div>
                <div className="space-y-1.5">
                  {p.options.map((opt: any) => {
                    const votes = opt._count?.votes || 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const selected = myVote === opt.id;
                    return (
                      <button key={opt.id} onClick={() => vote(p.id, opt.id)} className={`w-full text-right p-2 rounded-lg border transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={selected ? 'font-semibold' : ''}>{opt.text}</span>
                          <span className="text-[11px] text-muted-foreground">{pct}% · {votes}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">بواسطة {p.creator?.displayName} · {p.category}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreatePoll({ onCreated }: { onCreated: () => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [category, setCategory] = useState('عام');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) { toast.error('السؤال وخياران مطلوبان'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/community/polls', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, options: opts, category }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('أُنشئ الاستطلاع');
      onCreated();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">استطلاع جديد</p>
      <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="سؤال الاستطلاع" maxLength={200} />
      <div className="space-y-1.5">
        {options.map((o, i) => (
          <div key={i} className="flex gap-1.5">
            <Input value={o} onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? e.target.value : x))} placeholder={`الخيار ${i + 1}`} maxLength={100} />
            {options.length > 2 && <Button size="icon" variant="ghost" onClick={() => setOptions((os) => os.filter((_, j) => j !== i))}><Trash2 className="size-4 text-destructive" /></Button>}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => setOptions((o) => [...o, ''])}>+ خيار</Button>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{['عام', 'محاسبة', 'مذاكرة', 'اختبارات'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Button onClick={submit} disabled={busy} size="sm">{busy ? 'جارٍ الإنشاء...' : 'إنشاء الاستطلاع'}</Button>
    </Card>
  );
}
