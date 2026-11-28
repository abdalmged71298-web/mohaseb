'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GraduationCap } from 'lucide-react';

interface Row { id: number; name: string; credit: string; grade: string; }

const SYSTEMS: Record<string, { max: number; labels: Record<string, number> }> = {
  '5': {
    max: 5,
    labels: { 'A+': 5, 'A': 4.75, 'B+': 4.5, 'B': 4, 'C+': 3.5, 'C': 3, 'D+': 2.5, 'D': 2, 'F': 0 },
  },
  '4': {
    max: 4,
    labels: { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 },
  },
  '100': {
    max: 100,
    labels: {},
  },
};

const fmt = (n: number) => n.toFixed(2);

export function GpaCalculator() {
  const [system, setSystem] = useState('5');
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: '', credit: '3', grade: '' },
  ]);
  const [cumPrevPoints, setCumPrevPoints] = useState('');
  const [cumPrevHours, setCumPrevHours] = useState('');
  const [result, setResult] = useState<{ semester: number; cumulative: number; totalHours: number } | null>(null);

  const sys = SYSTEMS[system];

  const addRow = () => setRows((r) => [...r, { id: Date.now(), name: '', credit: '3', grade: '' }]);
  const delRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id));
  const upd = (id: number, k: keyof Row, val: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: val } : x)));

  const gradeToPoints = (g: string): number | null => {
    if (!g) return null;
    if (system === '100') {
      const n = parseFloat(g);
      if (isNaN(n)) return null;
      // map 0-100 to 0-max scale (5 or 4)
      if (n >= 95) return sys.max;
      if (n >= 90) return sys.max * 0.95;
      if (n >= 85) return sys.max * 0.9;
      if (n >= 80) return sys.max * 0.85;
      if (n >= 75) return sys.max * 0.8;
      if (n >= 70) return sys.max * 0.75;
      if (n >= 65) return sys.max * 0.7;
      if (n >= 60) return sys.max * 0.65;
      if (n >= 50) return sys.max * 0.6;
      return sys.max * 0.5;
    }
    return sys.labels[g.toUpperCase()] ?? null;
  };

  const compute = () => {
    let totalPoints = 0;
    let totalHours = 0;
    for (const r of rows) {
      const credit = parseFloat(r.credit) || 0;
      const pts = gradeToPoints(r.grade);
      if (pts === null || credit <= 0) continue;
      totalPoints += pts * credit;
      totalHours += credit;
    }
    if (totalHours === 0) {
      setResult(null);
      return;
    }
    const semester = totalPoints / totalHours;
    const prevPts = parseFloat(cumPrevPoints) || 0;
    const prevHrs = parseFloat(cumPrevHours) || 0;
    const cumPts = prevPts + totalPoints;
    const cumHrs = prevHrs + totalHours;
    const cumulative = cumHrs > 0 ? cumPts / cumHrs : semester;
    setResult({ semester, cumulative, totalHours: cumHrs });
  };

  const gradeOptions = Object.keys(sys.labels);

  return (
    <Card className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="size-5 text-violet-600" />
        <h3 className="font-bold">حاسبة المعدل الأكاديمي</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="mb-1.5 block text-xs">نظام الدرجات</Label>
          <Select value={system} onValueChange={setSystem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">من 5</SelectItem>
              <SelectItem value="4">من 4</SelectItem>
              <SelectItem value="100">من 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Badge variant="secondary">الحد الأقصى: {sys.max}</Badge>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-[1fr_80px_120px_40px] gap-2 text-xs font-semibold text-muted-foreground px-1">
          <span>المادة</span>
          <span>الساعات</span>
          <span>الدرجة</span>
          <span></span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_80px_120px_40px] gap-2 items-center">
            <Input value={r.name} onChange={(e) => upd(r.id, 'name', e.target.value)} placeholder="اسم المادة" />
            <Input type="number" value={r.credit} onChange={(e) => upd(r.id, 'credit', e.target.value)} />
            {system === '100' ? (
              <Input type="number" value={r.grade} onChange={(e) => upd(r.id, 'grade', e.target.value)} placeholder="0-100" />
            ) : (
              <Select value={r.grade} onValueChange={(v) => upd(r.id, 'grade', v)}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>{g} ({sys.labels[g]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" onClick={() => delRow(r.id)} aria-label="حذف">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRow} className="mb-4">
        <Plus className="size-4 ml-1" /> إضافة مادة
      </Button>

      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">لحساب المعدل التراكمي (أدخل بيانات الفصول السابقة)</summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs">مجموع النقاط السابقة</Label>
            <Input type="number" value={cumPrevPoints} onChange={(e) => setCumPrevPoints(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">إجمالي الساعات السابقة</Label>
            <Input type="number" value={cumPrevHours} onChange={(e) => setCumPrevHours(e.target.value)} />
          </div>
        </div>
      </details>

      <Button onClick={compute} className="w-full">احسب المعدل</Button>

      {result && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">المعدل الفصلي</p>
            <p className="text-xl font-bold text-primary">{fmt(result.semester)}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/20 text-center">
            <p className="text-xs text-muted-foreground">المعدل التراكمي</p>
            <p className="text-xl font-bold text-accent-foreground">{fmt(result.cumulative)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-xs text-muted-foreground">إجمالي الساعات</p>
            <p className="text-xl font-bold">{result.totalHours}</p>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3">
        للنظام من 100: يتم تحويل الدرجة تلقائياً إلى مقياس {sys.max}. تأكد من سلم الدرجات المعتمد في جامعتك.
      </p>
    </Card>
  );
}
