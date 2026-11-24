'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Layers, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { allSubjects } from '@/lib/platform-data';

const MASTERY = [
  { v: 0, label: 'جديد', color: 'bg-muted text-muted-foreground' },
  { v: 1, label: 'صعب', color: 'bg-rose-500/15 text-rose-600' },
  { v: 2, label: 'متوسط', color: 'bg-amber-500/15 text-amber-600' },
  { v: 3, label: 'متقن', color: 'bg-emerald-500/15 text-emerald-600' },
];

export function Flashcards() {
  const flashcards = usePlatformStore((s) => s.flashcards);
  const addFlashcard = usePlatformStore((s) => s.addFlashcard);
  const updateFlashcard = usePlatformStore((s) => s.updateFlashcard);
  const deleteFlashcard = usePlatformStore((s) => s.deleteFlashcard);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subject, setSubject] = useState('عام');
  const [filterSubj, setFilterSubj] = useState('all');
  const [reviewing, setReviewing] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const add = () => {
    if (!front.trim() || !back.trim()) return;
    addFlashcard({ front: front.trim(), back: back.trim(), subject: subject || 'عام', mastery: 0 });
    setFront('');
    setBack('');
  };

  const deck = filterSubj === 'all' ? flashcards : flashcards.filter((f) => f.subject === filterSubj);
  const subjectsList = Array.from(new Set(['عام', ...allSubjects.map((s) => s.title).slice(0, 40)])).slice(0, 50);

  if (reviewing && deck.length > 0) {
    const card = deck[idx];
    const m = MASTERY[card.mastery];
    return (
      <Card className="p-5 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary">{idx + 1} / {deck.length}</Badge>
          <Badge className={m.color}>{m.label}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setReviewing(false)}>إنهاء</Button>
        </div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full min-h-[200px] rounded-xl border-2 border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-6 hover:bg-primary/10 transition-colors"
        >
          <p className="text-xs text-muted-foreground mb-2">{flipped ? 'الإجابة' : 'السؤال'}</p>
          <p className="text-center text-lg font-medium">{flipped ? card.back : card.front}</p>
          <p className="text-xs text-muted-foreground mt-3">اضغط للقلب</p>
        </button>

        {flipped && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2 text-center">مستوى إتقانك للبطاقة:</p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((lvl) => (
                <Button
                  key={lvl}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFlashcard(card.id, { mastery: lvl as 1 | 2 | 3 });
                    next();
                  }}
                >
                  {MASTERY[lvl].label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={prev}><ChevronRight className="size-4" /> السابق</Button>
          <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}><RefreshCw className="size-4 ml-1" /> اقلب</Button>
          <Button variant="outline" size="sm" onClick={next}>التالي <ChevronLeft className="size-4" /></Button>
        </div>
      </Card>
    );
  }

  function next() {
    setFlipped(false);
    setIdx((i) => (i + 1) % deck.length);
  }
  function prev() {
    setFlipped(false);
    setIdx((i) => (i - 1 + deck.length) % deck.length);
  }

  const masteredCount = flashcards.filter((f) => f.mastery === 3).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="size-5 text-fuchsia-600" />
          <h3 className="font-bold">البطاقات التعليمية</h3>
          <Badge variant="secondary" className="mr-auto">{flashcards.length} بطاقة</Badge>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">السؤال (الوجه)</Label>
            <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="مثال: ما هو الفرق بين الأصل والخصم؟" rows={2} />
          </div>
          <div>
            <Label className="text-xs">الإجابة (الظهر)</Label>
            <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="الإجابة..." rows={2} />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {subjectsList.map((s) => (
                <SelectItem key={s} value={s}>{s.slice(0, 40)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add} className="w-full"><Plus className="size-4 ml-1" /> إضافة بطاقة</Button>
        </div>
      </Card>

      {flashcards.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Select value={filterSubj} onValueChange={setFilterSubj}>
              <SelectTrigger className="max-w-[200px]"><SelectValue placeholder="كل المواد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواد</SelectItem>
                {Array.from(new Set(flashcards.map((f) => f.subject))).map((s) => (
                  <SelectItem key={s} value={s}>{s.slice(0, 40)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setIdx(0); setFlipped(false); setReviewing(true); }} disabled={deck.length === 0}>
              <RefreshCw className="size-4 ml-1" /> ابدأ المراجعة ({deck.length})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">المتقن: {masteredCount} / {flashcards.length}</p>
          <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
            {deck.map((f) => (
              <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.front}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.back}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px]">{f.subject}</Badge>
                    <Badge className={`text-[10px] ${MASTERY[f.mastery].color}`}>{MASTERY[f.mastery].label}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteFlashcard(f.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
