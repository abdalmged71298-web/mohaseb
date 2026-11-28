'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Edit3, Save, MessageSquare, HelpCircle, CheckCircle2, Star, Trash2 } from 'lucide-react';
import { useMember } from './use-member';
import { toast } from 'sonner';

const LEVELS = ['المستوى الأول', 'المستوى الثاني', 'المستوى الثالث', 'المستوى الرابع', 'المستوى الخامس', 'المستوى السادس', 'المستوى السابع', 'المستوى الثامن', 'خريج', 'غير محدد'];
const BADGE_LABEL: Record<string, string> = { 'best-answer': 'أفضل إجابة', helper: 'مساعد نشط', active: 'مشارك نشط', top: 'مساهم متميز' };

export function CommunityProfile({ memberId }: { memberId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const { member, updateProfile } = useMember();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('غير محدد');
  const [bio, setBio] = useState('');
  const [color, setColor] = useState('#7b2cbf');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/community/profile?id=${memberId}`, { credentials: 'include' });
    const d = await r.json();
    setProfile(d.profile);
    setName(d.profile?.displayName || '');
    setLevel(d.profile?.level || 'غير محدد');
    setBio(d.profile?.bio || '');
    setColor(d.profile?.avatarColor || '#7b2cbf');
  };

  useEffect(() => { load(); }, [memberId]);

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile({ displayName: name, level, bio, avatarColor: color });
      toast.success('حُفظ التعديل');
      setEditing(false);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    if (!confirm('سيتم حذف حسابك وكل بياناتك نهائياً (المنشورات، التعليقات، الرسائل، الصداقات). لا يمكن التراجع. متابعة؟')) return;
    try {
      const r = await fetch('/api/community/member', { method: 'DELETE', credentials: 'include' });
      if (r.ok) {
        toast.success('حُذف الحساب');
        setTimeout(() => window.location.reload(), 800);
      } else { toast.error('تعذر الحذف'); }
    } catch { toast.error('تعذر الحذف'); }
  };

  if (!profile) return <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>;

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ backgroundColor: profile.avatarColor }}>
            {profile.displayName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{profile.displayName}</h2>
            <p className="text-xs text-muted-foreground">{profile.level}</p>
            {profile.bio && <p className="text-xs text-muted-foreground mt-1">{profile.bio}</p>}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {profile.badges.map((b: string) => (
                <Badge key={b} className="text-[10px] bg-primary/10 text-primary"><Award className="size-2.5 ml-0.5" /> {BADGE_LABEL[b] || b}</Badge>
              ))}
            </div>
          </div>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit3 className="size-3.5 ml-1" /> تعديل</Button>
          ) : null}
        </div>
      </Card>

      {editing && (
        <Card className="p-4 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العرض" maxLength={40} />
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة عنك (اختياري)" rows={2} maxLength={300} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {['#7b2cbf', '#0d9488', '#b45309', '#be123c', '#1d4ed8', '#15803d'].map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} aria-label="لون" />
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} size="sm"><Save className="size-3.5 ml-1" /> {busy ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>إلغاء</Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat icon={MessageSquare} label="منشورات" value={profile.stats.posts} />
        <Stat icon={HelpCircle} label="أسئلة" value={profile.stats.questions} />
        <Stat icon={CheckCircle2} label="إجابات" value={profile.stats.answers} />
        <Stat icon={Star} label="إجابات مقبولة" value={profile.stats.acceptedAnswers} />
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">نقاط المساهمة</span>
          <Badge className="bg-primary text-primary-foreground">{profile.stats.score} نقطة</Badge>
        </div>
      </Card>

      {/* Delete account */}
      <Card className="p-4 border-rose-500/30 bg-rose-500/5">
        <p className="text-xs font-semibold text-rose-600 mb-1">إلغاء الحساب</p>
        <p className="text-xs text-muted-foreground mb-3">حذف حسابك وكل بياناتك (المنشورات، التعليقات، الرسائل، الصداقات) نهائياً. لا يمكن التراجع.</p>
        <Button variant="outline" size="sm" className="text-rose-600 border-rose-500/40 hover:bg-rose-500/10" onClick={deleteAccount}>
          <Trash2 className="size-3.5 ml-1" /> إلغاء حسابي نهائياً
        </Button>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-3 text-center">
      <Icon className="size-5 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}
