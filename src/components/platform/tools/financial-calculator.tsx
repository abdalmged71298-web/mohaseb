'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';

type Mode =
  | 'discount' | 'vat' | 'margin' | 'profitLoss' | 'cost'
  | 'breakeven' | 'simpleInterest' | 'compoundInterest' | 'sellPrice';

const MODES: { id: Mode; label: string }[] = [
  { id: 'discount', label: 'خصم' },
  { id: 'vat', label: 'ضريبة القيمة المضافة' },
  { id: 'margin', label: 'هامش الربح' },
  { id: 'profitLoss', label: 'نسبة الربح/الخسارة' },
  { id: 'cost', label: 'تكلفة البضاعة' },
  { id: 'sellPrice', label: 'سعر البيع' },
  { id: 'breakeven', label: 'نقطة التعادل' },
  { id: 'simpleInterest', label: 'فائدة بسيطة' },
  { id: 'compoundInterest', label: 'فائدة مركبة' },
];

const fmt = (n: number) => (isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—');

export function FinancialCalculator() {
  const [mode, setMode] = useState<Mode>('discount');
  const [v, setV] = useState<Record<string, string>>({});
  const [out, setOut] = useState<string | null>(null);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  const num = (k: string) => parseFloat(v[k] || '0') || 0;

  const compute = () => {
    let r = '';
    try {
      switch (mode) {
        case 'discount': {
          const price = num('price'), disc = num('disc');
          const save = price * (disc / 100);
          r = `مبلغ الخصم: ${fmt(save)} | السعر بعد الخصم: ${fmt(price - save)}`;
          break;
        }
        case 'vat': {
          const amount = num('amount'), rate = num('rate');
          const tax = amount * (rate / 100);
          r = `قيمة الضريبة: ${fmt(tax)} | الإجمالي مع الضريبة: ${fmt(amount + tax)}`;
          break;
        }
        case 'margin': {
          const sell = num('sell'), cost = num('cost');
          const margin = sell - cost;
          const pct = sell > 0 ? (margin / sell) * 100 : 0;
          r = `الربح: ${fmt(margin)} | هامش الربح: ${fmt(pct)}%`;
          break;
        }
        case 'profitLoss': {
          const cost = num('cost'), sell = num('sell');
          const pl = sell - cost;
          const pct = cost > 0 ? (pl / cost) * 100 : 0;
          r = `${pl >= 0 ? 'ربح' : 'خسارة'}: ${fmt(Math.abs(pl))} | النسبة: ${fmt(Math.abs(pct))}%`;
          break;
        }
        case 'cost': {
          const sell = num('sell'), margin = num('margin');
          const cost = sell / (1 + margin / 100);
          r = `تكلفة البضاعة: ${fmt(cost)}`;
          break;
        }
        case 'sellPrice': {
          const cost = num('cost'), markup = num('markup');
          r = `سعر البيع: ${fmt(cost * (1 + markup / 100))}`;
          break;
        }
        case 'breakeven': {
          const fixed = num('fixed'), varCost = num('varCost'), price = num('price');
          const unit = price - varCost;
          if (unit <= 0) { r = 'السعر يجب أن يكون أكبر من التكلفة المتغيرة لكل وحدة'; break; }
          r = `نقطة التعادل: ${fmt(fixed / unit)} وحدة`;
          break;
        }
        case 'simpleInterest': {
          const principal = num('principal'), rate = num('rate'), years = num('years');
          const interest = principal * (rate / 100) * years;
          r = `الفائدة: ${fmt(interest)} | الإجمالي: ${fmt(principal + interest)} (افتراض: رأس مال ثابت وفائدة بسيطة سنوية)`;
          break;
        }
        case 'compoundInterest': {
          const principal = num('principal'), rate = num('rate'), years = num('years'), n = num('n') || 1;
          const total = principal * Math.pow(1 + rate / 100 / n, n * years);
          r = `الفائدة: ${fmt(total - principal)} | الإجمالي: ${fmt(total)} (افتراض: تراكم ${n} مرة سنوياً)`;
          break;
        }
      }
      setOut(r);
    } catch {
      setOut('خطأ في الحساب');
    }
  };

  const fields: Record<Mode, { k: string; label: string }[]> = {
    discount: [{ k: 'price', label: 'السعر الأصلي' }, { k: 'disc', label: 'نسبة الخصم %' }],
    vat: [{ k: 'amount', label: 'المبلغ' }, { k: 'rate', label: 'نسبة الضريبة %' }],
    margin: [{ k: 'sell', label: 'سعر البيع' }, { k: 'cost', label: 'التكلفة' }],
    profitLoss: [{ k: 'cost', label: 'التكلفة' }, { k: 'sell', label: 'سعر البيع' }],
    cost: [{ k: 'sell', label: 'سعر البيع' }, { k: 'margin', label: 'هامش الربح %' }],
    sellPrice: [{ k: 'cost', label: 'التكلفة' }, { k: 'markup', label: 'نسبة الإضافة %' }],
    breakeven: [{ k: 'fixed', label: 'التكاليف الثابتة' }, { k: 'varCost', label: 'التكلفة المتغيرة لكل وحدة' }, { k: 'price', label: 'سعر بيع الوحدة' }],
    simpleInterest: [{ k: 'principal', label: 'رأس المال' }, { k: 'rate', label: 'نسبة الفائدة السنوية %' }, { k: 'years', label: 'عدد السنوات' }],
    compoundInterest: [{ k: 'principal', label: 'رأس المال' }, { k: 'rate', label: 'نسبة الفائدة السنوية %' }, { k: 'years', label: 'عدد السنوات' }, { k: 'n', label: 'عدد مرات التراكم سنوياً' }],
  };

  return (
    <Card className="p-5 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="size-5 text-amber-600" />
        <h3 className="font-bold">الحاسبة المالية والمحاسبية</h3>
      </div>

      <div className="mb-4">
        <Label className="mb-1.5 block">نوع الحساب</Label>
        <Select value={mode} onValueChange={(m) => { setMode(m as Mode); setOut(null); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields[mode].map((f) => (
          <div key={f.k}>
            <Label className="mb-1.5 block text-xs">{f.label}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={v[f.k] || ''}
              onChange={(e) => set(f.k, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <Button onClick={compute} className="w-full">احسب</Button>

      {out && (
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm">
          <Badge variant="secondary" className="mb-1">النتيجة</Badge>
          <p className="font-mono text-foreground font-medium" dir="ltr">{out}</p>
        </div>
      )}
    </Card>
  );
}
