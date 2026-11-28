'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler, ArrowLeftRight } from 'lucide-react';

type Category = 'length' | 'weight' | 'volume' | 'speed' | 'area' | 'temperature' | 'data';

const UNITS: Record<Category, { label: string; factor: number }[]> = {
  length: [
    { label: 'متر', factor: 1 },
    { label: 'كيلومتر', factor: 1000 },
    { label: 'سنتيمتر', factor: 0.01 },
    { label: 'مليمتر', factor: 0.001 },
    { label: 'ميل', factor: 1609.344 },
    { label: 'ياردة', factor: 0.9144 },
    { label: 'قدم', factor: 0.3048 },
    { label: 'إنش', factor: 0.0254 },
  ],
  weight: [
    { label: 'كيلوجرام', factor: 1 },
    { label: 'جرام', factor: 0.001 },
    { label: 'طن', factor: 1000 },
    { label: 'رطل', factor: 0.45359237 },
    { label: 'أونصة', factor: 0.028349523125 },
  ],
  volume: [
    { label: 'لتر', factor: 1 },
    { label: 'ميليلتر', factor: 0.001 },
    { label: 'متر مكعب', factor: 1000 },
    { label: 'جالون (أمريكي)', factor: 3.785411784 },
    { label: 'كوب', factor: 0.2365882365 },
  ],
  speed: [
    { label: 'متر/ثانية', factor: 1 },
    { label: 'كيلومتر/ساعة', factor: 0.277777778 },
    { label: 'ميل/ساعة', factor: 0.44704 },
    { label: 'عقدة', factor: 0.514444444 },
  ],
  area: [
    { label: 'متر مربع', factor: 1 },
    { label: 'كيلومتر مربع', factor: 1000000 },
    { label: 'هكتار', factor: 10000 },
    { label: 'فدان', factor: 4200 },
    { label: 'ميل مربع', factor: 2589988.110336 },
    { label: 'قدم مربع', factor: 0.09290304 },
  ],
  temperature: [
    { label: 'مئوية', factor: 1 },
    { label: 'فهرنهايت', factor: 1 },
    { label: 'كلفن', factor: 1 },
  ],
  data: [
    { label: 'بايت', factor: 1 },
    { label: 'كيلوبايت', factor: 1024 },
    { label: 'ميجابايت', factor: 1024 ** 2 },
    { label: 'جيجابايت', factor: 1024 ** 3 },
    { label: 'تيرابايت', factor: 1024 ** 4 },
  ],
};

const CAT_LABELS: Record<Category, string> = {
  length: 'الطول',
  weight: 'الوزن',
  volume: 'الحجم',
  speed: 'السرعة',
  area: 'المساحة',
  temperature: 'درجة الحرارة',
  data: 'حجم البيانات',
};

function convert(value: number, from: string, to: string, cat: Category): number {
  if (cat === 'temperature') {
    // to celsius first
    let c: number;
    if (from === 'مئوية') c = value;
    else if (from === 'فهرنهايت') c = (value - 32) * (5 / 9);
    else c = value - 273.15; // kelvin
    if (to === 'مئوية') return c;
    if (to === 'فهرنهايت') return c * (9 / 5) + 32;
    return c + 273.15;
  }
  const fromU = UNITS[cat].find((u) => u.label === from)!;
  const toU = UNITS[cat].find((u) => u.label === to)!;
  return (value * fromU.factor) / toU.factor;
}

export function UnitConverter() {
  const [cat, setCat] = useState<Category>('length');
  const [from, setFrom] = useState(UNITS.length[0].label);
  const [to, setTo] = useState(UNITS.length[1].label);
  const [val, setVal] = useState('1');

  const changeCat = (c: Category) => {
    setCat(c);
    setFrom(UNITS[c][0].label);
    setTo(UNITS[c][1].label);
  };

  const num = parseFloat(val) || 0;
  const result = convert(num, from, to, cat);
  const swap = () => { setFrom(to); setTo(from); };

  return (
    <Card className="p-5 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="size-5 text-cyan-600" />
        <h3 className="font-bold">محول الوحدات</h3>
      </div>

      <div className="mb-4">
        <Label className="mb-1.5 block text-xs">التصنيف</Label>
        <Select value={cat} onValueChange={(v) => changeCat(v as Category)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(CAT_LABELS).map((c) => (
              <SelectItem key={c} value={c}>{CAT_LABELS[c as Category]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
        <div>
          <Label className="text-xs">من</Label>
          <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="mb-2" />
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS[cat].map((u) => (
                <SelectItem key={u.label} value={u.label}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" className="mb-1" onClick={swap}>
          <ArrowLeftRight className="size-4" />
        </Button>
        <div>
          <Label className="text-xs">إلى</Label>
          <Input readOnly value={isFinite(result) ? result.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'} className="mb-2 font-mono" />
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS[cat].map((u) => (
                <SelectItem key={u.label} value={u.label}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted text-center">
        <p className="text-sm">
          <span className="font-mono font-bold">{num}</span> {from} ={' '}
          <span className="font-mono font-bold text-primary">
            {isFinite(result) ? result.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'}
          </span> {to}
        </p>
      </div>
    </Card>
  );
}
