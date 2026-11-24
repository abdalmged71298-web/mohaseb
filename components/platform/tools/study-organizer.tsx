'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CalendarClock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { allSubjects } from '@/lib/platform-data';

const PRIORITIES = [
  { v: 'high', label: 'عالية', color: 'text-rose-600 bg-rose-500/10' },
  { v: 'medium', label: 'متوسطة', color: 'text-amber-600 bg-amber-500/10' },
  { v: 'low', label: 'منخفضة', color: 'text-sky-600 bg-sky-500/10' },
];

export function StudyOrganizer() {
  const todos = usePlatformStore((s) => s.todos);
  const addTodo = usePlatformStore((s) => s.addTodo);
  const updateTodo = usePlatformStore((s) => s.updateTodo);
  const deleteTodo = usePlatformStore((s) => s.deleteTodo);

  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'overdue' | 'upcoming'>('all');

  const add = () => {
    if (!text.trim()) return;
    addTodo({ text: text.trim(), subject: subject || undefined, done: false, priority, dueDate: dueDate || undefined });
    setText('');
    setDueDate('');
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = todos.filter((t) => {
    switch (filter) {
      case 'active': return !t.done;
      case 'done': return t.done;
      case 'overdue': return !t.done && t.dueDate && t.dueDate < today;
      case 'upcoming': return !t.done && t.dueDate && t.dueDate >= today;
      default: return true;
    }
  });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.done).length,
    done: todos.filter((t) => t.done).length,
    overdue: todos.filter((t) => !t.done && t.dueDate && t.dueDate < today).length,
    upcoming: todos.filter((t) => !t.done && t.dueDate && t.dueDate >= today).length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="size-5 text-rose-600" />
          <h3 className="font-bold">منظم الدراسة</h3>
        </div>

        <div className="space-y-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="مهمة جديدة (واجب، اختبار، مذاكرة...)" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="المادة (اختياري)" /></SelectTrigger>
              <SelectContent>
                {allSubjects.slice(0, 60).map((s) => (
                  <SelectItem key={s.id} value={s.title}>{s.title.slice(0, 35)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button onClick={add} className="w-full"><Plus className="size-4 ml-1" /> إضافة المهمة</Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {([
          { v: 'all', label: 'الكل' },
          { v: 'active', label: 'نشطة' },
          { v: 'upcoming', label: 'قادمة' },
          { v: 'overdue', label: 'متأخرة' },
          { v: 'done', label: 'مكتملة' },
        ] as const).map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {f.label} ({counts[f.v]})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            لا توجد مهام في هذا التصنيف.
          </Card>
        ) : (
          filtered.map((t) => {
            const pr = PRIORITIES.find((p) => p.v === t.priority)!;
            const overdue = !t.done && t.dueDate && t.dueDate < today;
            return (
              <Card key={t.id} className={`p-3 ${t.done ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(v) => updateTodo(t.id, { done: v === true })}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.done ? 'line-through' : ''}`}>{t.text}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${pr.color}`}>{pr.label}</Badge>
                      {t.subject && (
                        <Badge variant="secondary" className="text-[10px] truncate max-w-[160px]">{t.subject}</Badge>
                      )}
                      {t.dueDate && (
                        <Badge variant={overdue ? 'destructive' : 'outline'} className="text-[10px]">
                          {overdue && <AlertCircle className="size-3 ml-1" />}
                          {t.dueDate}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => deleteTodo(t.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
