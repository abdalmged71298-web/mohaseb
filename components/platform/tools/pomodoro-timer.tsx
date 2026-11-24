'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Timer, Coffee } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { allSubjects } from '@/lib/platform-data';
import { toast } from 'sonner';

const PRESETS = [
  { label: 'تركيز 25 دقيقة', focus: 25, break: 5 },
  { label: 'تركيز 50 دقيقة', focus: 50, break: 10 },
  { label: 'تركيز 15 دقيقة', focus: 15, break: 3 },
];

export function PomodoroTimer() {
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState('');
  const addSession = usePlatformStore((s) => s.addSession);
  const sessions = usePlatformStore((s) => s.sessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = mode === 'focus' ? focusMin * 60 : breakMin * 60;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // session ended
          if (mode === 'focus') {
            addSession({ subject: subject || 'دراسة عامة', minutes: focusMin, date: new Date().toISOString() });
            toast.success('انتهت جلسة التركيز! وقت الاستراحة');
            setMode('break');
            setSecondsLeft(breakMin * 60);
          } else {
            toast.success('انتهت الاستراحة! عودة للتركيز');
            setMode('focus');
            setSecondsLeft(focusMin * 60);
          }
          return mode === 'focus' ? breakMin * 60 : focusMin * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, focusMin, breakMin, subject, addSession]);

  const start = () => {
    if (secondsLeft <= 0) setSecondsLeft(total);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setMode('focus');
    setSecondsLeft(focusMin * 60);
  };

  const applyPreset = (f: number, b: number) => {
    setRunning(false);
    setFocusMin(f);
    setBreakMin(b);
    setMode('focus');
    setSecondsLeft(f * 60);
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const progress = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;
  const circumference = 2 * Math.PI * 90;

  const totalStudyMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const totalHours = Math.floor(totalStudyMin / 60);
  const totalRemMin = totalStudyMin % 60;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="size-5 text-sky-600" />
          <h3 className="font-bold">مؤقت الدراسة (بومودورو)</h3>
        </div>

        {/* Circular timer */}
        <div className="relative w-56 h-56 mx-auto my-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted opacity-20" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke="currentColor" strokeWidth="10" strokeLinecap="round"
              className={mode === 'focus' ? 'text-primary' : 'text-accent-foreground'}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold font-mono" dir="ltr">
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </div>
            <Badge variant={mode === 'focus' ? 'default' : 'secondary'} className="mt-2">
              {mode === 'focus' ? '🧠 تركيز' : <><Coffee className="size-3 ml-1" /> استراحة</>}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          {!running ? (
            <Button onClick={start} size="lg"><Play className="size-5 ml-1" /> ابدأ</Button>
          ) : (
            <Button onClick={pause} variant="secondary" size="lg"><Pause className="size-5 ml-1" /> إيقاف</Button>
          )}
          <Button onClick={reset} variant="outline" size="lg"><RotateCcw className="size-5" /></Button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.focus, p.break)}
              className="px-2 py-2 rounded-lg text-xs border border-border hover:border-primary/40 bg-card text-center"
            >
              <p className="font-semibold">{p.focus}/{p.break}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">دقيقة</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">تركيز (دقيقة)</Label>
            <Input type="number" value={focusMin} onChange={(e) => { const v = parseInt(e.target.value) || 1; setFocusMin(v); if (mode === 'focus' && !running) setSecondsLeft(v * 60); }} />
          </div>
          <div>
            <Label className="text-xs">استراحة (دقيقة)</Label>
            <Input type="number" value={breakMin} onChange={(e) => { const v = parseInt(e.target.value) || 1; setBreakMin(v); if (mode === 'break' && !running) setSecondsLeft(v * 60); }} />
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs">المادة (لتسجيل الجلسة)</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="اختر مادة" /></SelectTrigger>
            <SelectContent>
              {allSubjects.slice(0, 60).map((s) => (
                <SelectItem key={s.id} value={s.title}>{s.title.slice(0, 40)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">إحصائيات الدراسة</p>
            <p className="text-xs text-muted-foreground">
              {totalHours} ساعة و {totalRemMin} دقيقة عبر {sessions.length} جلسة
            </p>
          </div>
          <Badge variant="secondary">{sessions.length} جلسة</Badge>
        </div>
        {sessions.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto scroll-thin space-y-1">
            {sessions.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <span className="truncate">{s.subject}</span>
                <span className="text-muted-foreground shrink-0">{s.minutes} د</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
