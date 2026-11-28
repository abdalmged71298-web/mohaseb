'use client';

import { useMemo } from 'react';
import { Star, BookOpen, ExternalLink, Trash2, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlatformStore } from '@/lib/store';
import { allFiles, fileTypeMeta, type FileType, type Category } from '@/lib/platform-data';
import { toast } from 'sonner';

export function FavoritesTab() {
  const favorites = usePlatformStore((s) => s.favorites);
  const toggleFavorite = usePlatformStore((s) => s.toggleFavorite);
  const addRecent = usePlatformStore((s) => s.addRecent);
  const setSelectedCategory = usePlatformStore((s) => s.setSelectedCategory);
  const setSelectedSubject = usePlatformStore((s) => s.setSelectedSubject);
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  // Map favorited URLs back to their full file info (dedup by URL)
  const favFiles = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof allFiles = [];
    for (const url of favorites) {
      if (seen.has(url)) continue;
      seen.add(url);
      const f = allFiles.find((x) => x.url === url);
      if (f) out.push(f);
    }
    return out;
  }, [favorites]);

  const openSubject = (cat: string, subjectId: string) => {
    setSelectedCategory(cat as Category);
    setSelectedSubject(subjectId);
    setActiveTab('subjects');
  };

  const removeFav = (url: string, label: string) => {
    toggleFavorite(url);
    toast.success(`أُزيل "${label.slice(0, 30)}" من المفضلة`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="size-5 text-amber-500 fill-current" /> موادي المفضلة
          </h2>
          <p className="text-sm text-muted-foreground">
            {favFiles.length > 0
              ? `${favFiles.length} ملف محفوظ — محفوظة على هذا الجهاز فقط`
              : 'الملفات التي تضيفها بالنجمة تظهر هنا'}
          </p>
        </div>
        {favFiles.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('library')}
          >
            <FolderOpen className="size-4 ml-1" /> الذهاب للمكتبة
          </Button>
        )}
      </div>

      {favFiles.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <Star className="size-7 text-amber-500" />
          </div>
          <p className="font-semibold">لا توجد مواد مفضلة بعد</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            اضغط على رمز النجمة <Star className="inline size-3.5 fill-current text-amber-500" /> بجانب أي ملف في تبويب التخصصات أو المكتبة لإضافته هنا. تظهر المفضلة على هذا الجهاز ولا تتزامن بين الأجهزة تلقائياً.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setActiveTab('subjects')}>
            تصفح المواد
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-3 bg-amber-500/5 border-amber-500/20">
            <p className="text-xs text-muted-foreground text-center">
              تُحفظ المفضلة في متصفحك (localStorage) على هذا الجهاز فقط. مسح بيانات المتصفح يزيلها.
            </p>
          </Card>
          <div className="grid gap-2">
            {favFiles.map((f, i) => {
              const meta = fileTypeMeta[f.type as FileType];
              const isFav = true;
              return (
                <Card key={i} className="p-3 card-hover hover:shadow-sm flex items-center gap-2.5">
                  <span className="text-base shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => addRecent({ url: f.url, label: f.label, subjectTitle: f.subjectTitle, type: f.type })}
                      className="text-sm font-medium hover:text-primary transition-colors block truncate"
                    >
                      {f.label}
                    </a>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{f.typeLabel}</Badge>
                      <span className="text-[11px] text-muted-foreground truncate">{f.subjectTitle}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => openSubject(f.category, f.subjectId)}
                      title="فتح المادة الأصلية"
                    >
                      <BookOpen className="size-4 ml-1" /> المادة
                    </Button>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="size-8" title="فتح الملف">
                        <ExternalLink className="size-4" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-amber-500"
                      onClick={() => removeFav(f.url, f.label)}
                      title="إزالة من المفضلة"
                    >
                      <Star className="size-4 fill-current" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
