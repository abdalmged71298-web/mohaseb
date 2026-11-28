'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileQuestion, CheckCircle2, XCircle } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'tf';
  options: string[];
  correct: number; // index for mcq, 0=true 1=false for tf
  explanation?: string;
}

// Built-in sample accounting questions
const SAMPLE: Question[] = [
  {
    id: 's1',
    text: 'المعادلة المحاسبية الأساسية هي:',
    type: 'mcq',
    options: ['الأصول = الالتزامات + حقوق الملكية', 'الأصول = الإيرادات - المصروفات', 'الالتزامات = الأصول + حقوق الملكية', 'حقوق الملكية = الأصول + الالتزامات'],
    correct: 0,
    explanation: 'المعادلة الأساسية: الأصول = الالتزامات + حقوق الملكية.',
  },
  {
    id: 's2',
    text: 'القيد المحاسبي لشراء أصل نقداً يكون:',
    type: 'mcq',
    options: ['من ح/ الأصل إلى ح/ النقدية', 'من ح/ النقدية إلى ح/ الأصل', 'من ح/ المصروفات إلى ح/ النقدية', 'من ح/ الأصل إلى ح/ الإيرادات'],
    correct: 0,
    explanation: 'زيادة الأصل (مدين) وزيادة النقدية بالخروج (دائن).',
  },
  {
    id: 's3',
    text: 'مبدأ الاستحقاق يعني تسجيل الإيرادات عند تحققها بغض النظر عن قبضها.',
    type: 'tf',
    options: ['صحيح', 'خطأ'],
    correct: 0,
    explanation: 'مبدأ الاستحقاق: الإيرادات والمصروفات تسجل عند تحققها لا عند قبضها أو دفعها.',
  },
  {
    id: 's4',
    text: 'الميزانية العمومية تعكس المركز المالي في فترة زمنية محددة.',
    type: 'tf',
    options: ['صحيح', 'خطأ'],
    correct: 0,
    explanation: 'الميزانية العمومية لحظية تعكس المركز المالي في تاريخ محدد.',
  },
  {
    id: 's5',
    text: 'الأصل الذي يسهل تحويله إلى نقدية خلال سنة يسمى:',
    type: 'mcq',
    options: ['أصل ثابت', 'أصل متداول', 'أصل غير ملموس', 'التزام طويل الأجل'],
    correct: 1,
    explanation: 'الأصل المتداول (جاري) يتحول إلى نقدية خلال دورة التشغيل أو سنة.',
  },
];

export function QuizTool() {
  const quizResults = usePlatformStore((s) => s.quizResults);
  const addQuizResult = usePlatformStore((s) => s.addQuizResult);

  const [questions, setQuestions] = useState<Question[]>(SAMPLE);
  const [mode, setMode] = useState<'bank' | 'take' | 'result'>('bank');
  const [qForm, setQForm] = useState<Partial<Question>>({ type: 'mcq', options: ['', '', '', ''] });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ correct: number; total: number; details: { q: Question; chosen: number; ok: boolean }[] } | null>(null);

  const addQ = () => {
    const text = (qForm.text || '').trim();
    if (!text) { toast.error('أدخل نص السؤال'); return; }
    const type = qForm.type || 'mcq';
    const options = qForm.options || [];
    if (type === 'mcq' && options.filter(Boolean).length < 2) { toast.error('أدخل خيارين على الأقل'); return; }
    const q: Question = {
      id: 'q' + Date.now(),
      text,
      type,
      options: type === 'tf' ? ['صحيح', 'خطأ'] : options.map((o) => o.trim()).filter(Boolean),
      correct: qForm.correct ?? 0,
      explanation: qForm.explanation,
    };
    setQuestions((qs) => [...qs, q]);
    setQForm({ type: 'mcq', options: ['', '', '', ''] });
    toast.success('أُضيف السؤال');
  };

  const startQuiz = () => {
    if (questions.length === 0) return;
    setAnswers({});
    setResult(null);
    setMode('take');
  };

  const submit = () => {
    const details = questions.map((q) => {
      const chosen = answers[q.id] ?? -1;
      return { q, chosen, ok: chosen === q.correct };
    });
    const correct = details.filter((d) => d.ok).length;
    setResult({ correct, total: questions.length, details });
    addQuizResult({ subject: 'بنك الأسئلة', total: questions.length, correct });
    setMode('result');
  };

  if (mode === 'take') {
    return (
      <Card className="p-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><FileQuestion className="size-5 text-orange-600" /> الاختبار التفاعلي</h3>
          <Badge variant="secondary">{Object.keys(answers).length} / {questions.length} مُجاب</Badge>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="p-3 rounded-lg border border-border">
              <p className="font-medium text-sm mb-2">{i + 1}. {q.text}</p>
              <RadioGroup
                value={String(answers[q.id] ?? '')}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: parseInt(v) }))}
              >
                {q.options.map((opt, j) => (
                  <label key={j} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted/50 px-2 rounded">
                    <RadioGroupItem value={String(j)} id={`${q.id}-${j}`} />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={submit} className="flex-1">تسليم الإجابات</Button>
          <Button variant="outline" onClick={() => setMode('bank')}>إلغاء</Button>
        </div>
      </Card>
    );
  }

  if (mode === 'result' && result) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <Card className="p-5 max-w-2xl mx-auto">
        <div className="text-center mb-4">
          <div className={`text-4xl font-bold ${pct >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>{pct}%</div>
          <p className="text-sm text-muted-foreground">{result.correct} من {result.total} إجابة صحيحة</p>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto scroll-thin">
          {result.details.map((d, i) => (
            <div key={i} className={`p-3 rounded-lg border ${d.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
              <div className="flex items-start gap-2">
                {d.ok ? <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{i + 1}. {d.q.text}</p>
                  {!d.ok && d.chosen >= 0 && (
                    <p className="text-xs text-rose-600 mt-1">إجابتك: {d.q.options[d.chosen]}</p>
                  )}
                  <p className="text-xs text-emerald-600 mt-0.5">الإجابة الصحيحة: {d.q.options[d.q.correct]}</p>
                  {d.q.explanation && (
                    <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted/40 rounded">الشرح: {d.q.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={startQuiz} className="flex-1">إعادة الاختبار</Button>
          <Button variant="outline" onClick={() => setMode('bank')}>العودة لبنك الأسئلة</Button>
        </div>
      </Card>
    );
  }

  // Bank mode
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><FileQuestion className="size-5 text-orange-600" /> بنك الأسئلة</h3>
          <Button onClick={startQuiz} disabled={questions.length === 0}>ابدأ الاختبار</Button>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 mb-4">
          <p className="text-xs font-semibold mb-2">إضافة سؤال جديد</p>
          <Input
            value={qForm.text || ''}
            onChange={(e) => setQForm((f) => ({ ...f, text: e.target.value }))}
            placeholder="نص السؤال"
            className="mb-2"
          />
          <Select value={qForm.type} onValueChange={(v) => setQForm((f) => ({ ...f, type: v as 'mcq' | 'tf', options: v === 'tf' ? ['صحيح', 'خطأ'] : f.options?.length ? f.options : ['', '', '', ''] }))}>
            <SelectTrigger className="mb-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">اختيار من متعدد</SelectItem>
              <SelectItem value="tf">صح / خطأ</SelectItem>
            </SelectContent>
          </Select>
          {qForm.type === 'mcq' && (
            <div className="space-y-1.5 mb-2">
              {(qForm.options || []).map((opt, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Checkbox checked={qForm.correct === j} onCheckedChange={() => setQForm((f) => ({ ...f, correct: j }))} />
                  <Input value={opt} onChange={(e) => setQForm((f) => ({ ...f, options: f.options!.map((o, k) => k === j ? e.target.value : o) }))} placeholder={`الخيار ${j + 1}`} />
                </div>
              ))}
            </div>
          )}
          <Input value={qForm.explanation || ''} onChange={(e) => setQForm((f) => ({ ...f, explanation: e.target.value }))} placeholder="شرح الإجابة (اختياري)" className="mb-2" />
          <Button size="sm" onClick={addQ}><Plus className="size-4 ml-1" /> إضافة</Button>
        </div>

        <p className="text-xs text-muted-foreground mb-2">{questions.length} سؤال في البنك</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto scroll-thin">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 p-2 rounded border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i + 1}. {q.text}</p>
                <p className="text-xs text-emerald-600 truncate">الإجابة: {q.options[q.correct]}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {quizResults.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-2">سجل المحاولات</p>
          <div className="space-y-1">
            {quizResults.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <span>{r.correct}/{r.total} صحيحة</span>
                <span className="text-muted-foreground">{Math.round((r.correct / r.total) * 100)}%</span>
                <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString('ar')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
