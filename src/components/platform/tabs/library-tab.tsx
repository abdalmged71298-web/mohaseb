'use client';

import { useMemo, useState } from 'react';
import { Search, Star, Clock, X, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  allFiles,
  allSubjects,
  fileTypeMeta,
  categoryMeta,
  type Category,
  type FileType,
} from '@/lib/platform-data';
import { usePlatformStore } from '@/lib/store';
import { FileLink } from '../file-link';

const FILE_TYPES: FileType[] = ['videos', 'books', 'models', 'summaries', 'Telegram', 'news'];
const CATEGORIES: Category[] = ['college', 'major', 'univ', 'Optional'];

export function LibraryTab() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [subjId, setSubjId] = useState<string>('all');
  const [types, setTypes] = useState<FileType[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [view, setView] = useState<'all' | 'recent' | 'fav'>('all');

  const favorites = usePlatformStore((s) => s.favorites);
  const recents = usePlatformStore((s) => s.recents);

  const subjectsForCat = useMemo(() => {
    if (cat === 'all') return allSubjects;
    return allSubjects.filter((s) => s.category === cat);
  }, [cat]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return allFiles.filter((f) => {
      if (cat !== 'all' && f.category !== cat) return false;
      if (subjId !== 'all' && f.subjectId !== subjId) return false;
      if (types.length > 0 && !types.includes(f.type)) return false;
      if (favOnly && !favorites.includes(f.url)) return false;
      if (query && !f.label.toLowerCase().includes(query) && !f.subjectTitle.toLowerCase().includes(query))
        return false;
      return true;
    });
  }, [q, cat, subjId, types, favOnly, favorites]);

  const toggleType = (t: FileType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const reset = () => {
    setQ('');
    setCat('all');
    setSubjId('all');
    setTypes([]);
    setFavOnly(false);
    setView('all');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">المكتبة التعليمية</h2>
          <p className="text-sm text-muted-foreground">
            {allFiles.length} ملف موزعة على {allSubjects.length} مادة — التخصص ← المادة ← نوع الملف
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={view === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setView('all');
              setFavOnly(false);
            }}
          >
            الكل
          </Button>
          <Button
            variant={view === 'fav' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setView('fav');
              setFavOnly(true);
            }}
          >
            <Star className="size-4 ml-1" /> المفضلة ({favorites.length})
          </Button>
          <Button
            variant={view === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('recent')}
          >
            <Clock className="size-4 ml-1" /> الأخيرة
          </Button>
        </div>
      </div>

      {view === 'recent' ? (
        <RecentView />
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم الملف أو المادة..."
                className="pr-9"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={cat} onValueChange={(v) => { setCat(v); setSubjId('all'); }}>
                <SelectTrigger>
                  <SelectValue placeholder="القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryMeta[c].icon} {categoryMeta[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subjId} onValueChange={setSubjId}>
                <SelectTrigger>
                  <SelectValue placeholder="المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المواد</SelectItem>
                  {subjectsForCat.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="truncate">{s.title.slice(0, 28)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="col-span-2 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {FILE_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border ${
                        types.includes(t)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      <span>{fileTypeMeta[t].icon}</span>
                      <span>{fileTypeMeta[t].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={favOnly} onCheckedChange={(v) => setFavOnly(v === true)} />
                <span>المفضلة فقط</span>
              </label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{filtered.length} نتيجة</Badge>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <Filter className="size-3.5 ml-1" /> إعادة ضبط
                </Button>
              </div>
            </div>
          </Card>

          {/* Results */}
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              لا توجد ملفات مطابقة. جرّب تعديل عوامل التصفية.
            </Card>
          ) : (
            <div className="grid gap-2">
              {filtered.slice(0, 200).map((f, i) => (
                <FileLink
                  key={i}
                  label={f.label}
                  url={f.url}
                  type={f.type}
                  subjectTitle={f.subjectTitle}
                />
              ))}
              {filtered.length > 200 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  يتم عرض أول 200 ملف من أصل {filtered.length}. استخدم البحث أو التصفية لتضييق النتائج.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecentView() {
  const recents = usePlatformStore((s) => s.recents);
  if (recents.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        <Clock className="size-8 mx-auto mb-2 opacity-40" />
        لا توجد ملفات مفتوحة حديثاً. سيظهر هنا آخر الملفات التي تفتحها.
      </Card>
    );
  }
  return (
    <div className="grid gap-2">
      {recents.map((r, i) => (
        <FileLink
          key={i}
          label={r.label}
          url={r.url}
          type={r.type as FileType}
          subjectTitle={r.subjectTitle}
        />
      ))}
    </div>
  );
}
