'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Pin, Trash2, Edit2, Download, Sparkles, X, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformStore, type Note } from '@/lib/store';
import { allSubjects } from '@/lib/platform-data';
import { toast } from 'sonner';

const COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe', '#fee2e2', '#e0f2fe', '#f5f5f5'];

const subjectsList = ['عام', ...allSubjects.map((s) => s.title).slice(0, 40)];

export function NotesTab() {
  const notes = usePlatformStore((s) => s.notes);
  const addNote = usePlatformStore((s) => s.addNote);
  const updateNote = usePlatformStore((s) => s.updateNote);
  const deleteNote = usePlatformStore((s) => s.deleteNote);

  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '', content: '', category: 'عام', color: COLORS[0], pinned: false,
  });
  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (filterCat !== 'all' && n.category !== filterCat) return false;
        if (query && !n.title.toLowerCase().includes(query) && !n.content.toLowerCase().includes(query))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, q, filterCat]);

  const save = () => {
    if (!draft.title.trim() && !draft.content.trim()) {
      toast.error('أدخل عنواناً أو محتوى');
      return;
    }
    addNote(draft);
    setCreating(false);
    setDraft({ title: '', content: '', category: 'عام', color: COLORS[0], pinned: false });
    toast.success('حُفظت الملاحظة');
  };

  const saveEdit = () => {
    if (!editing) return;
    updateNote(editing.id, { title: editing.title, content: editing.content, category: editing.category, color: editing.color, pinned: editing.pinned });
    setEditing(null);
    toast.success('تم التحديث');
  };

  const exportNote = (n: Note) => {
    const text = `${n.title || 'ملاحظة بلا عنوان'}\nالتصنيف: ${n.category}\nالتاريخ: ${new Date(n.updatedAt).toLocaleString('ar')}\n\n${n.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${n.title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  };

  const exportAll = () => {
    if (notes.length === 0) return;
    const text = notes.map((n) => `# ${n.title || 'بدون عنوان'}\n[${n.category}] ${new Date(n.updatedAt).toLocaleString('ar')}\n\n${n.content}\n\n---\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mynotes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير كل الملاحظات');
  };

  const aiSummarize = async (n: Note) => {
    if (!n.content.trim()) { toast.error('الملاحظة فارغة'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `لخّص الملاحظة التالية في نقاط مختصرة وواضحة، ثم استخرج الكلمات المفتاحية:\n\n${n.content}`,
        }),
      });
      if (!res.ok) throw new Error('فشل الطلب');
      const data = await res.json();
      setAiResult(data.reply || 'لا توجد إجابة');
    } catch {
      toast.error('تعذر الاتصال بالمساعد الذكي');
    } finally {
      setAiLoading(false);
    }
  };

  const Editor = ({ note, setNote, onSave, onCancel }: {
    note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
    setNote: (n: any) => void;
    onSave: () => void;
    onCancel: () => void;
  }) => (
    <Card className="p-4" style={{ backgroundColor: note.color }}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary">محرر الملاحظة</Badge>
        <Button variant="ghost" size="icon" className="size-8" onClick={onCancel}><X className="size-4" /></Button>
      </div>
      <Input
        value={note.title}
        onChange={(e) => setNote({ ...note, title: e.target.value })}
        placeholder="عنوان الملاحظة"
        className="mb-2 font-semibold"
      />
      <Textarea
        value={note.content}
        onChange={(e) => setNote({ ...note, content: e.target.value })}
        placeholder="اكتب ملاحظتك هنا... (يدعم أسطر متعددة)"
        rows={8}
        className="mb-2 resize-y"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Select value={note.category} onValueChange={(v) => setNote({ ...note, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {subjectsList.map((s) => (
              <SelectItem key={s} value={s}>{s.slice(0, 35)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNote({ ...note, color: c })}
              className={`w-6 h-6 rounded-full border-2 ${note.color === c ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label="لون"
            />
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
        <input type="checkbox" checked={note.pinned} onChange={(e) => setNote({ ...note, pinned: e.target.checked })} />
        <span>تثبيت الملاحظة</span>
      </label>
      <Button onClick={onSave} className="w-full">حفظ</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">دفتر ملاحظاتي</h2>
          <p className="text-sm text-muted-foreground">{notes.length} ملاحظة — تُحفظ في متصفحك</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={exportAll} disabled={notes.length === 0}>
            <Download className="size-4 ml-1" /> تصدير الكل
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4 ml-1" /> ملاحظة جديدة
          </Button>
        </div>
      </div>

      {creating && (
        <Editor
          note={draft}
          setNote={setDraft}
          onSave={save}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <Editor
          note={editing}
          setNote={setEditing}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {aiResult && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-primary text-primary-foreground"><Sparkles className="size-3 ml-1" /> تلخيص ذكي</Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('تم النسخ'); }}>
                <Copy className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setAiResult(null)}><X className="size-4" /></Button>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiResult}</div>
        </Card>
      )}

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الملاحظات..." className="pr-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {Array.from(new Set(notes.map((n) => n.category))).map((c) => (
              <SelectItem key={c} value={c}>{c.slice(0, 30)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {notes.length === 0 ? 'لا توجد ملاحظات بعد. ابدأ بإنشاء أول ملاحظة.' : 'لا توجد ملاحظات مطابقة.'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((n) => (
            <Card key={n.id} className="p-3 card-hover hover:shadow-md flex flex-col" style={{ backgroundColor: n.color, borderColor: 'transparent' }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm line-clamp-1 flex-1">{n.title || 'بدون عنوان'}</p>
                {n.pinned && <Pin className="size-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-foreground/70 line-clamp-4 whitespace-pre-wrap flex-1">{n.content}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                <Badge variant="secondary" className="text-[10px]">{n.category}</Badge>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => aiSummarize(n)} title="تلخيص ذكي">
                    <Sparkles className="size-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(n)} title="تعديل">
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => exportNote(n)} title="تصدير">
                    <Download className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => { deleteNote(n.id); toast.success('حُذفت'); }} title="حذف">
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <Card className="p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            ملاحظتك تُحفظ تلقائياً في متصفحك. لمسح بيانات المتصفح أو الانتقال لجهاز آخر سيؤثر على توفرها.
          </p>
        </Card>
      )}
    </div>
  );
}
