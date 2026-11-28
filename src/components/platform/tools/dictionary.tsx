'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookText, Search } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';

interface SeedTerm {
  term: string;
  definition: string;
  example?: string;
  category: string;
}

const SEED: SeedTerm[] = [
  { term: 'الأصل', definition: 'مورد اقتصادي مملوك للمنشأة ينتظر منه منفعة مستقبلية.', example: 'النقدية، المخزون، المباني.', category: 'محاسبة' },
  { term: 'الالتزام', definition: 'التزام حالي على المنشأة ناتج عن أحداث سابقة ينتج عنه تدفق خروج للموارد.', example: 'قروض، دائنون.', category: 'محاسبة' },
  { term: 'حقوق الملكية', definition: 'الحق المتبقي في أصول المنشأة بعد طرح التزاماتها.', example: 'رأس المال، الأرباح المحتجزة.', category: 'محاسبة' },
  { term: 'الإيراد', definition: 'زيادة في المنافع الاقتصادية خلال الفترة على شكل تدفقات داخلة.', example: 'إيرادات المبيعات.', category: 'محاسبة' },
  { term: 'المصروف', definition: 'نقص في المنافع الاقتصادية خلال الفترة على شكل تدفقات خارجة.', example: 'الإيجار، الرواتب.', category: 'محاسبة' },
  { term: 'القيد المحاسبي', definition: 'تسجيل عملية مالية في الدفاتر بطريقة مدين/دائن.', example: 'من ح/ النقدية إلى ح/ المبيعات.', category: 'محاسبة' },
  { term: 'الميزانية العمومية', definition: 'قائمة مالية تعكس المركز المالي للمنشأة في تاريخ محدد.', category: 'محاسبة' },
  { term: 'قائمة الدخل', definition: 'قائمة مالية تعرض الإيرادات والمصروفات وصافي الربح أو الخسارة لفترة محددة.', category: 'محاسبة' },
  { term: 'التقاعد', definition: 'مبلغ يخصص لسداد دين أو استبدال أصل عند تاريخ محدد.', category: 'محاسبة' },
  { term: 'الإهلاك', definition: 'توزيع تكلفة الأصل الثابت على فترات عمره الإنتاجي.', example: 'إهلاك السيارات، المباني.', category: 'محاسبة' },
  { term: 'مبدأ الاستحقاق', definition: 'تسجيل الإيرادات والمصروفات عند تحققها بغض النظر عن قبضها أو دفعها.', category: 'مبادئ' },
  { term: 'مبدأ الثبات', definition: 'استخدام نفس السياسات المحاسبية من فترة لأخرى.', category: 'مبادئ' },
  { term: 'مبدأ التكلفة التاريخية', definition: 'تسجيل الأصول بتكلفتها وقت الاقتناء.', category: 'مبادئ' },
  { term: 'العرض النقدي', definition: 'الأساس الذي يسجل فيه الإيراد عند قبضه والمصروف عند دفعه.', category: 'مبادئ' },
  { term: 'الذمم المدينة', definition: 'مبالغ مستحقة للمنشأة على العملاء نتيجة بيع بالأجل.', category: 'محاسبة' },
  { term: 'الذمم الدائنة', definition: 'مبالغ مستحقة على المنشأة للموردين نتيجة شراء بالأجل.', category: 'محاسبة' },
  { term: 'نقطة التعادل', definition: 'حجم المبيعات الذي تتساوى عنده الإيرادات الكلية مع التكاليف الكلية.', category: 'تكاليف' },
  { term: 'الهامش', definition: 'الفرق بين سعر البيع والتكلفة، ويعبر عن الربح لكل وحدة.', category: 'تكاليف' },
  { term: 'التكلفة المتغيرة', definition: 'تكلفة تتغير طردياً مع حجم النشاط.', example: 'مواد خام.', category: 'تكاليف' },
  { term: 'التكلفة الثابتة', definition: 'تكلفة لا تتغير مع حجم النشاط ضمن حدود معينة.', example: 'الإيجار.', category: 'تكاليف' },
];

export function Dictionary() {
  const customTerms = usePlatformStore((s) => s.terms);
  const addTerm = usePlatformStore((s) => s.addTerm);
  const deleteTerm = usePlatformStore((s) => s.deleteTerm);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [form, setForm] = useState<SeedTerm>({ term: '', definition: '', example: '', category: 'محاسبة' });

  const allTerms = [...customTerms.map((t) => ({ ...t, custom: true })), ...SEED.map((t) => ({ ...t, id: '', custom: false, createdAt: 0 }))];
  const cats = Array.from(new Set(allTerms.map((t) => t.category)));
  const filtered = allTerms.filter((t) => {
    if (cat !== 'all' && t.category !== cat) return false;
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      return t.term.toLowerCase().includes(query) || t.definition.toLowerCase().includes(query);
    }
    return true;
  });

  const add = () => {
    if (!form.term.trim() || !form.definition.trim()) return;
    addTerm({ term: form.term.trim(), definition: form.definition.trim(), example: form.example || undefined, category: form.category });
    setForm({ term: '', definition: '', example: '', category: form.category });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookText className="size-5 text-indigo-600" />
          <h3 className="font-bold">القاموس الأكاديمي</h3>
          <Badge variant="secondary" className="mr-auto">{filtered.length} مصطلح</Badge>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مصطلح..." className="pr-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
          {filtered.map((t, i) => (
            <div key={t.term + i} className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.term}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.definition}</p>
                  {t.example && <p className="text-xs text-muted-foreground mt-1">مثال: {t.example}</p>}
                  <Badge variant="outline" className="text-[10px] mt-1.5">{t.category}</Badge>
                </div>
                {t.custom && t.id && (
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteTerm(t.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">لا توجد مصطلحات مطابقة.</p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">إضافة مصطلح جديد</p>
        <div className="space-y-2">
          <Input value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} placeholder="المصطلح" />
          <Textarea value={form.definition} onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))} placeholder="التعريف" rows={2} />
          <Input value={form.example} onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))} placeholder="مثال (اختياري)" />
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['محاسبة', 'مبادئ', 'تكاليف', 'اقتصاد', 'إدارة', 'أخرى'].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add} className="w-full"><Plus className="size-4 ml-1" /> إضافة المصطلح</Button>
        </div>
      </Card>
    </div>
  );
}
