'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Sparkles } from 'lucide-react';
import { useMember } from './use-member';
import { toast } from 'sonner';

const COLORS = ['#7b2cbf', '#0d9488', '#b45309', '#be123c', '#1d4ed8', '#15803d', '#9333ea', '#0891b2'];
const LEVELS = ['المستوى الأول', 'المستوى الثاني', 'المستوى الثالث', 'المستوى الرابع', 'المستوى الخامس', 'المستوى السادس', 'المستوى السابع', 'المستوى الثامن', 'خريج', 'غير محدد'];

export function JoinGate({ onJoined }: { onJoined?: () => void }) {
  const { join } = useMember();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('غير محدد');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error('أدخل اسم العرض'); return; }
    setBusy(true);
    try {
      await join(name.trim(), level, color);
      toast.success('أهلاً بك في المجتمع!');
      onJoined?.();
    } catch (e: any) {
      toast.error(e.message || 'تعذر الانضمام');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl header-gradient text-primary-foreground flex items-center justify-center mx-auto mb-3 shadow-md">
        <Users className="size-8" />
      </div>
      <h2 className="text-lg font-bold">انضم إلى مجتمع الطلاب</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        اختر اسماً وصفًا للعرض للمشاركة في النقاشات والأسئلة والمحادثات. لا حاجة لكلمة مرور — هويتك محفوظة على هذا المتصفح.
      </p>

      <div className="space-y-3 text-right">
        <div>
          <Label className="text-xs mb-1.5 block">اسم العرض</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: طالب المحاسبة" maxLength={40} />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">المستوى الدراسي</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">لون ملفك الشخصي</Label>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label="لون" />
            ))}
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full mt-4">
        <Sparkles className="size-4 ml-1" /> {busy ? 'جارٍ الانضمام...' : 'انضم الآن'}
      </Button>
      <p className="text-[11px] text-muted-foreground mt-3">
        بالمشاركة أنت توافق على الالتزام بآداب النقاش الأكاديمي. يمكن تعديل بياناتك لاحقاً من ملفك الشخصي.
      </p>
    </Card>
  );
}
