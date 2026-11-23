'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { examInfo } from '@/lib/platform-data';

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const targetMs = new Date(target).getTime();
  const diff = Math.max(0, targetMs - now);
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { months, days, hours, minutes, seconds, done: diff === 0 };
}

export function FloatingTimeBar() {
  const cd = useCountdown(examInfo.date);
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 pointer-events-none"
      aria-live="polite"
    >
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-card/95 backdrop-blur border border-border shadow-md px-3 py-1.5 text-xs sm:text-sm">
          <Clock className="size-3.5 sm:size-4 text-primary shrink-0" />
          <span className="text-muted-foreground shrink-0 hidden sm:inline">الوقت المتبقي للاختبارات:</span>
          <span className="text-muted-foreground shrink-0 sm:hidden">الاختبارات:</span>
          {cd.done ? (
            <span className="font-semibold text-emerald-600">انتهت فترة الاختبارات</span>
          ) : (
            <span className="font-mono font-semibold text-foreground tabular-nums" dir="ltr">
              {cd.months > 0 && `${cd.months}ش `}
              {cd.days > 0 && `${cd.days}ي `}
              {String(cd.hours).padStart(2, '0')}:
              {String(cd.minutes).padStart(2, '0')}:
              {String(cd.seconds).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
