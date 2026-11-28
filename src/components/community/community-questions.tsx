'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowRight, CheckCircle2, HelpCircle, Trash2, Send, Heart } from 'lucide-react';
import { allSubjects } from '@/lib/platform-data';
import { toast } from 'sonner';
import { useRealtimeEvents, RT_EVENTS, useVisiblePolling } from './use-member';

const SUBJECTS = ['عام', ...allSubjects.map((s) => s.title).slice(0, 30)];
const STATUS_LABEL: Record<string, string> = { open: 'بانتظار الإجابة', answered: 'تمت الإجابة', solved: 'تم الحل' };
const STATUS_COLOR: Record<string, string> = { open: 'bg-amber-500/15 text-amber-600', answered: 'bg-sky-500/15 text-sky-600', solved: 'bg-emerald-500/15 text-emerald-600' };

export function CommunityQuestions({ memberId }: { memberId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [subject, setSubject] = useState('all');
  const [mine, setMine] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (subject !== 'all') params.set('subject', subject);
    if (mine) params.set('mine', '1');
    const r = await fetch(`/api/community/questions?${params}`, { credentials: 'include', cache: 'no-store' });
    const d = await r.json();
    setQuestions(d.questions || []);
    if (!silent) setLoading(false);
  }, [status, subject, mine]);

  useEffect(() => { load(); }, [load]);

  // Background polling: refresh questions every 5s while the tab is visible.
  useVisiblePolling(() => load(true), 5000, [load]);

  // Real-time: new question → prepend (dedup); status update → patch
  useRealtimeEvents({
    [RT_EVENTS.QUESTION_NEW]: (payload: any) => {
      setQuestions((prev) => {
        if (prev.some((q) => q.id === payload.question.id)) return prev;
        return [payload.question, ...prev];
      });
    },
    [RT_EVENTS.QUESTION_UPDATE]: (payload: any) => {
      setQuestions((prev) => prev.map((q) => q.id === payload.questionId ? { ...q, status: payload.status } : q));
    },
  }, []);

  if (selected) {
    return <QuestionDetail id={selected} memberId={memberId} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">الأسئلة</h3>
        <Button size="sm" onClick={() => setCreating((c) => !c)}><Plus className="size-4 ml-1" /> سؤال جديد</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="open">بانتظار الإجابة</SelectItem>
            <SelectItem value="answered">تمت الإجابة</SelectItem>
            <SelectItem value="solved">تم الحل</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s.slice(0, 25)}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant={mine ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setMine((m) => !m)}>أسئلتي</Button>
      </div>

      {creating && <CreateQuestion onCreated={() => { setCreating(false); load(); }} />}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : questions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا توجد أسئلة مطابقة.</Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <button key={q.id} onClick={() => setSelected(q.id)} className="w-full text-right card-hover">
              <Card className="p-3 hover:border-primary/40 hover:shadow-md">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[10px] ${STATUS_COLOR[q.status]}`}>{STATUS_LABEL[q.status]}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.subject}</Badge>
                  <span className="text-[11px] text-muted-foreground">{q._count?.answers || 0} إجابة</span>
                </div>
                <p className="text-sm font-medium">{q.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{q.author?.displayName}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateQuestion({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('عام');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/community/questions', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, subject }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('طُرح السؤال');
      onCreated();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">سؤال جديد</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان السؤال" maxLength={150} />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="تفاصيل السؤال..." rows={3} />
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s.slice(0, 25)}</SelectItem>)}</SelectContent>
      </Select>
      <Button onClick={submit} disabled={busy} size="sm">{busy ? 'جارٍ الطرح...' : 'طرح السؤال'}</Button>
    </Card>
  );
}

function QuestionDetail({ id, memberId, onBack }: { id: string; memberId: string; onBack: () => void }) {
  const [data, setData] = useState<{ question: any; answers: any[] } | null>(null);
  const [answer, setAnswer] = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`/api/community/questions/${id}`, { credentials: 'include' });
    const d = await r.json();
    setData({ question: d.question, answers: d.answers });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: live answers + accept status on this question
  useRealtimeEvents({
    [RT_EVENTS.ANSWER_NEW]: (payload: any) => {
      if (payload.questionId !== id) return;
      setData((s) => s ? { question: { ...s.question, status: payload.status }, answers: [...s.answers, payload.answer] } : s);
    },
    [RT_EVENTS.ANSWER_UPDATE]: (payload: any) => {
      if (payload.questionId !== id) return;
      setData((s) => s ? {
        question: { ...s.question, status: payload.status },
        answers: s.answers.map((a) => ({ ...a, accepted: a.id === payload.acceptedAnswerId })),
      } : s);
    },
  }, [id]);

  const addAnswer = async () => {
    if (!answer.trim()) return;
    const r = await fetch(`/api/community/questions/${id}/answers`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: answer }),
    });
    const d = await r.json();
    if (r.ok) { setAnswer(''); setData((s) => s ? { ...s, answers: [...s.answers, { ...d.answer, liked: false }] } : s); }
  };

  const accept = async (answerId: string) => {
    const r = await fetch(`/api/community/questions/${id}/accept?answerId=${answerId}`, { method: 'POST', credentials: 'include' });
    if (r.ok) { toast.success('تم قبول الإجابة'); load(); }
    else { const d = await r.json(); toast.error(d.error); }
  };

  const likeAnswer = async (answerId: string, idx: number) => {
    // Simple like toggle via answers route isn't built; skip for brevity but keep UI.
    toast.info('الإعجاب بالإجابة سيُضاف لاحقاً');
  };

  if (!data) return <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>;
  const { question, answers } = data;
  const canAccept = question.authorId === memberId;

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowRight className="size-4 rotate-180 ml-1" /> رجوع</Button>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`text-[10px] ${STATUS_COLOR[question.status]}`}>{STATUS_LABEL[question.status]}</Badge>
          <Badge variant="outline" className="text-[10px]">{question.subject}</Badge>
        </div>
        <h2 className="text-lg font-bold">{question.title}</h2>
        {question.content && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{question.content}</p>}
        <p className="text-[11px] text-muted-foreground mt-2">{question.author?.displayName}</p>
      </Card>

      <Card className="p-4">
        <p className="font-semibold text-sm mb-3">الإجابات ({answers.length})</p>
        <div className="space-y-2 mb-3">
          {answers.map((a, i) => (
            <div key={a.id} className={`p-3 rounded-lg border ${a.accepted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: a.author?.avatarColor }} />
                <span className="text-xs font-medium">{a.author?.displayName}</span>
                {a.accepted && <Badge className="text-[10px] bg-emerald-500 text-white"><CheckCircle2 className="size-2.5 ml-0.5" /> مقبولة</Badge>}
                <span className="text-[10px] text-muted-foreground mr-auto">{new Date(a.createdAt).toLocaleString('ar')}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => likeAnswer(a.id, i)} className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className={`size-3 ${a.liked ? 'fill-current text-rose-500' : ''}`} /> {a._count?.likes || 0}</button>
                {canAccept && !a.accepted && <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => accept(a.id)}><CheckCircle2 className="size-3 ml-1" /> قبول الإجابة</Button>}
              </div>
            </div>
          ))}
          {answers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2"><HelpCircle className="inline size-4 ml-1" /> لا إجابات بعد. كن أول من يجيب!</p>}
        </div>
        <div className="flex gap-2">
          <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="اكتب إجابتك..." onKeyDown={(e) => e.key === 'Enter' && addAnswer()} />
          <Button size="icon" onClick={addAnswer}><Send className="size-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
