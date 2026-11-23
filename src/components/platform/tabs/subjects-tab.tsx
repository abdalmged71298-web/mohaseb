'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowRight, GraduationCap, Megaphone, BookOpen, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  platformData,
  categoryMeta,
  fileTypeMeta,
  graduateNames,
  graduateMessages,
  graduateResearch,
  type Category,
  type FileType,
} from '@/lib/platform-data';
import { usePlatformStore } from '@/lib/store';
import { FileLink } from '../file-link';

const CATEGORY_KEYS: { key: string; label: string; hours: number; icon: string }[] = [
  { key: 'college', label: 'متطلبات كلية', hours: 52, icon: '📚' },
  { key: 'major', label: 'متطلبات تخصص', hours: 52, icon: '📘' },
  { key: 'univ', label: 'متطلبات جامعية', hours: 25, icon: '🏛' },
  { key: 'Optional', label: 'متطلبات اختيارية', hours: 6, icon: '🎯' },
  { key: 'graduate', label: 'رسالة خريج', hours: 0, icon: '🎓' },
  { key: 'Advertisement', label: 'إعلانات الجامعة', hours: 0, icon: '📢' },
];

const SUB_TABS: { key: FileType; label: string }[] = [
  { key: 'videos', label: 'فيديوهات' },
  { key: 'books', label: 'كتب' },
  { key: 'models', label: 'نماذج' },
  { key: 'summaries', label: 'ملخصات' },
  { key: 'Telegram', label: 'تليجرام' },
  { key: 'news', label: 'دليل المذاكرة' },
];

export function SubjectsTab() {
  const selectedCategory = usePlatformStore((s) => s.selectedCategory);
  const selectedSubjectId = usePlatformStore((s) => s.selectedSubjectId);
  const setSelectedCategory = usePlatformStore((s) => s.setSelectedCategory);
  const setSelectedSubject = usePlatformStore((s) => s.setSelectedSubject);
  const toggleFavSubject = usePlatformStore((s) => s.toggleFavoriteSubject);
  const isFavSubject = usePlatformStore((s) => s.isFavoriteSubject);

  const subjects =
    selectedCategory !== 'graduate' && selectedCategory !== 'Advertisement'
      ? platformData[selectedCategory as Category] || []
      : [];

  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [selectedSubjectId, subjects]);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1">
        {CATEGORY_KEYS.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setSelectedCategory(c.key);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
              selectedCategory === c.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border hover:border-primary/40'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
            {c.hours > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  selectedCategory === c.key
                    ? 'bg-white/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {c.hours}س
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Subject list — scrolls independently, page stays put */}
        <Card className="p-3 lg:sticky lg:top-32 self-start flex flex-col max-h-[78vh]">
          <p className="text-xs font-semibold text-muted-foreground px-1 pb-2 shrink-0">
            {selectedCategory === 'graduate'
              ? 'الخريجون'
              : selectedCategory === 'Advertisement'
                ? 'إعلانات'
                : 'قائمة المواد'}
          </p>
          <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin min-h-0 max-h-[68vh] pr-1">
            <div className="space-y-1">
              {selectedCategory === 'graduate' &&
                graduateNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedSubject(name)}
                    className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      selectedSubjectId === name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <GraduationCap className="size-4 shrink-0" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              {selectedCategory === 'Advertisement' && (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  اضغط على أي إعلان في الجهة المقابلة لفتحه.
                </div>
              )}
              {subjects.map((s) => {
                const isFav = isFavSubject(s.id);
                return (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-1 rounded-lg transition-colors ${
                      selectedSubjectId === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedSubject(s.id)}
                      className="flex-1 min-w-0 text-right px-3 py-2.5 text-sm"
                    >
                      <span className="block leading-snug">{s.title}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavSubject(s.id); }}
                      className={`shrink-0 px-2 py-2.5 ${isFav ? 'text-amber-400' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100'} hover:text-amber-400 transition-opacity`}
                      aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <Star className={`size-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Detail panel */}
        <div className="min-w-0">
          {selectedCategory === 'Advertisement' ? (
            <AdvertisementView />
          ) : selectedCategory === 'graduate' ? (
            <GraduateView name={selectedSubjectId} />
          ) : selectedSubject ? (
            <SubjectDetail subject={selectedSubject} categoryLabel={categoryMeta[selectedCategory as Category]?.label || ''} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <BookOpen className="size-7 text-primary" />
      </div>
      <p className="font-semibold">اختر مادة من القائمة</p>
      <p className="text-sm text-muted-foreground mt-1">
        حدد القسم أعلاه ثم اختر مادة لعرض الفيديوهات والكتب والنماذج والملخصات.
      </p>
    </Card>
  );
}

function SubjectDetail({
  subject,
  categoryLabel,
}: {
  subject: (typeof platformData)[Category][number];
  categoryLabel: string;
}) {
  const [sub, setSub] = useState<FileType>('videos');
  const items = (subject[sub] || []) as { label: string; url: string }[];
  const detailRef = useRef<HTMLDivElement>(null);

  // Smooth-scroll the detail panel into view when a subject is selected,
  // so on mobile (where detail is below the list) the user sees its content.
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [subject.id]);

  const counts: Record<FileType, number> = {
    videos: subject.videos?.length || 0,
    books: subject.books?.length || 0,
    models: subject.models?.length || 0,
    summaries: subject.summaries?.length || 0,
    Telegram: subject.Telegram?.length || 0,
    news: subject.news?.length || 0,
  };

  return (
    <div ref={detailRef} className="scroll-mt-28">
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Badge variant="outline" className="mb-2">
            {categoryLabel}
          </Badge>
          <h2 className="text-lg sm:text-xl font-bold leading-tight">{subject.title}</h2>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-border pb-3">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sub === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/70'
            }`}
          >
            <span>{fileTypeMeta[t.key].icon}</span>
            <span>{t.label}</span>
            {counts[t.key] > 0 && (
              <span
                className={`text-[10px] px-1.5 rounded-full ${
                  sub === t.key ? 'bg-white/20' : 'bg-background/60'
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          لا يوجد محتوى في هذا القسم حالياً.
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((it, i) => (
            <FileLink
              key={i}
              label={it.label}
              url={it.url}
              type={sub}
              subjectTitle={subject.title}
            />
          ))}
        </div>
      )}
    </Card>
    </div>
  );
}

// Lightweight local state hook to avoid extra store fields
function GraduateView({ name }: { name: string | null }) {
  if (!name) {
    return (
      <Card className="p-8 text-center">
        <GraduationCap className="size-10 text-primary mx-auto mb-2" />
        <p className="font-semibold">اختر اسم خريج</p>
        <p className="text-sm text-muted-foreground mt-1">
          لعرض رسالة التخرج وملفات البحث.
        </p>
      </Card>
    );
  }
  const msg = graduateMessages.find((g) => g.name === name);
  const res = graduateResearch.find((g) => g.name === name);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
            🎓
          </div>
          <div>
            <h2 className="text-lg font-bold">{name}</h2>
            <p className="text-xs text-muted-foreground">دفعة 2025 — قسم المحاسبة</p>
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <span>📜</span> رسالة التخرج
        </h3>
        {msg?.messageHtml ? (
          <div
            className="msg-prose text-sm leading-relaxed text-foreground/90 bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-y-auto scroll-thin"
            dangerouslySetInnerHTML={{ __html: msg.messageHtml }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            لا توجد رسالة متاحة لهذا الخريج بعد.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>📁</span> بحث التخرج
        </h3>
        {res && res.files.length > 0 ? (
          <div className="grid gap-2">
            {res.files.map((f, i) => (
              <FileLink
                key={i}
                label={f.text}
                url={f.url}
                type="books"
                subjectTitle={name}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            لا توجد ملفات بحث متاحة لهذا الخريج.
          </p>
        )}
      </Card>
    </div>
  );
}

function AdvertisementView() {
  const ads = platformData.AdvertisementAnnouncements;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Megaphone className="size-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">إعلانات الجامعة</h2>
          <p className="text-xs text-muted-foreground">{ads.length} إعلان</p>
        </div>
      </div>
      <div className="grid gap-2">
        {ads.map((a, i) => (
          <FileLink
            key={i}
            label={a.label}
            url={a.url}
            type="books"
            subjectTitle="إعلانات الجامعة"
          />
        ))}
      </div>
    </Card>
  );
}
