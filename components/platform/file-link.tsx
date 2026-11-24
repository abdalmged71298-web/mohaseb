'use client';

import { Star, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlatformStore } from '@/lib/store';
import { toast } from 'sonner';
import { fileTypeMeta, type FileType } from '@/lib/platform-data';

const TYPE_COLORS: Record<FileType, string> = {
  videos: 'bg-red-500/10 text-red-600 dark:text-red-400',
  books: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  models: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  summaries: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Telegram: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  news: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export function FileLink({
  label,
  url,
  type,
  subjectTitle,
}: {
  label: string;
  url?: string;
  type: FileType;
  subjectTitle?: string;
}) {
  const isFav = usePlatformStore((s) => s.favorites.includes(url || ''));
  const toggleFav = usePlatformStore((s) => s.toggleFavorite);
  const addRecent = usePlatformStore((s) => s.addRecent);
  const [copied, setCopied] = useState(false);

  const meta = fileTypeMeta[type];
  const hasUrl = !!url;

  const handleOpen = () => {
    if (!hasUrl) return;
    addRecent({ url: url!, label, subjectTitle: subjectTitle || '', type });
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!hasUrl) return;
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const toggleF = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!hasUrl) return;
    toggleFav(url!);
    toast.success(isFav ? 'أُزيل من المفضلة' : 'أُضيف للمفضلة');
  };

  if (!hasUrl) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
        <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
        <span className="text-sm text-muted-foreground leading-relaxed flex-1 min-w-0">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpen}
        className="flex items-start gap-2.5 flex-1 min-w-0"
      >
        <span
          className={`text-base shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[type]}`}
        >
          {meta.icon}
        </span>
        <span className="text-sm font-medium leading-relaxed flex-1 min-w-0 break-words group-hover:text-primary transition-colors">
          {label}
        </span>
        <ExternalLink className="size-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={copyLink}
          aria-label="نسخ الرابط"
        >
          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 ${isFav ? 'text-amber-500' : ''}`}
          onClick={toggleF}
          aria-label="إضافة للمفضلة"
        >
          <Star className={`size-4 ${isFav ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
