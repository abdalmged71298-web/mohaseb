'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useMember } from './use-member';
import { toast } from 'sonner';

const COLORS = ['#7b2cbf', '#0d9488', '#b45309', '#be123c', '#1d4ed8', '#15803d', '#9333ea', '#0891b2'];
const LEVELS = ['المستوى الأول', 'المستوى الثاني', 'المستوى الثالث', 'المستوى الرابع', 'المستوى الخامس', 'المستوى السادس', 'المستوى السابع', 'المستوى الثامن', 'خريج', 'غير محدد'];

type CheckState = 'idle' | 'checking' | 'taken' | 'available';

export function JoinGate({ onJoined }: { onJoined?: () => void }) {
  const { join } = useMember();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('غير محدد');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [check, setCheck] = useState<CheckState>('idle');

  // Debounced availability check — queries the search endpoint and compares
  // case-insensitively (trimming spaces) so the user gets instant feedback.
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setCheck('idle'); setError(''); return; }
    setCheck('checking');
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/community/search?q=${encodeURIComponent(trimmed)}`, { credentials: 'include' });
        const d = await r.json();
        const taken = (d.members || []).some((m: any) => m.displayName.trim().toLowerCase() === trimmed.toLowerCase());
        setCheck(taken ? 'taken' : 'available');
        if (taken) setError('هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر وإعادة المحاولة.');
        else setError('');
      } catch {
        setCheck('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('أدخل اسم العرض'); return; }
    if (check === 'taken') { setError('هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر وإعادة المحاولة.'); return; }
    setError('');
    setBusy(true);
    try {
      await join(trimmed, level, color);
      toast.success('أهلاً بك في منتدى الطالب!');
      onJoined?.();
    } catch (e: any) {
      // Server-side validation (handles race conditions via DB unique constraint)
      setError(e.message || 'تعذر الانضمام');
      toast.error(e.message || 'تعذر الانضمام');
      setCheck('taken');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl header-gradient text-primary-foreground flex items-center justify-center mx-auto mb-3 shadow-md">
        <Users className="size-8" />
      </div>
      <h2 className="text-lg font-bold">انضم إلى منتدى الطالب</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        اختر اسماً وصفًا للعرض للمشاركة في النقاشات والأسئلة والمحادثات. لا حاجة لكلمة مرور — هويتك محفوظة على هذا المتصفح.
      </p>

      <div className="space-y-3 text-right">
        <div>
          <Label className="text-xs mb-1.5 block">اسم العرض</Label>
          <div className="relative">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: طالب المحاسبة"
              maxLength={40}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className={check === 'taken' ? 'border-rose-500 pr-9' : check === 'available' ? 'border-emerald-500 pr-9' : 'pr-9'}
            />
            {check === 'checking' && <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
            {check === 'available' && <Check className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />}
            {check === 'taken' && <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-rose-500" />}
          </div>
          {error && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${check === 'taken' || check === 'idle' ? 'text-rose-600' : ''}`}>
              <AlertCircle className="size-3 shrink-0" /> {error}
            </p>
          )}
          {check === 'available' && <p className="text-xs mt-1.5 text-emerald-600 flex items-center gap-1"><Check className="size-3 shrink-0" /> الاسم متاح</p>}
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

      <Button onClick={submit} disabled={busy || check === 'taken'} className="w-full mt-4">
        <Sparkles className="size-4 ml-1" /> {busy ? 'جارٍ الانضمام...' : 'انضم الآن'}
      </Button>
      <p className="text-[11px] text-muted-foreground mt-3">
        بالمشاركة أنت توافق على الالتزام بآداب النقاش الأكاديمي. يمكن تعديل بياناتك لاحقاً من ملفك الشخصي.
      </p>
    </Card>
  );
}
