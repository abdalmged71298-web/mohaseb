'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Files, Megaphone, Wrench, Bot, NotebookPen, Clock, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  platformMeta,
  welcomeSpeech,
  stats,
  examInfo,
  categoryMeta,
  welcomeMessages,
  type Category,
} from '@/lib/platform-data';
import { usePlatformStore } from '@/lib/store';

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

const fmtAr = (n: number, singular: string, dual: string, few: string, many: string) => {
  if (n === 1) return `1 ${singular}`;
  if (n === 2) return `2 ${dual}`;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

export function HomeTab() {
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);
  const setSelectedCategory = usePlatformStore((s) => s.setSelectedCategory);
  const setSelectedSubject = usePlatformStore((s) => s.setSelectedSubject);
  const cd = useCountdown(examInfo.date);
  const [welcomeIdx, setWelcomeIdx] = useState(0);

  const cats: Category[] = ['college', 'major', 'univ', 'Optional'];

  const quickCards = [
    { icon: BookOpen, label: 'التخصصات والمواد', desc: `${stats.subjects} مادة`, tab: 'subjects' as const },
    { icon: Files, label: 'المكتبة التعليمية', desc: `${stats.files} ملف`, tab: 'library' as const },
    { icon: Wrench, label: 'التطبيقات والأدوات', desc: 'حاسبات وأدوات دراسية', tab: 'tools' as const },
    { icon: Bot, label: 'المساعد الذكي', desc: 'إجابات وتلخيص واختبارات', tab: 'assistant' as const },
    { icon: NotebookPen, label: 'ملاحظاتي', desc: 'دفترك الشخصي', tab: 'notes' as const },
    { icon: Megaphone, label: 'الإعلانات', desc: 'آخر تحديثات الجامعة', tab: 'announcements' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 header-gradient opacity-10" aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl header-gradient flex items-center justify-center text-3xl shrink-0 shadow-md">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {platformMeta.title}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {platformMeta.subtitle} — {platformMeta.university}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">📚 {stats.subjects} مادة</Badge>
                <Badge variant="secondary">🗂️ {stats.files} ملف</Badge>
                <Badge variant="secondary">🛠️ {stats.tools} أداة</Badge>
                <Badge variant="secondary">🤖 مساعد ذكي</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Exam countdown */}
      <Card className="border-accent/40 bg-accent/5">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <Clock className="size-6 text-accent-foreground" />
          </div>
          <div className="flex-1 text-center sm:text-right">
            <p className="font-semibold text-sm sm:text-base">
              {cd.done ? 'انتهت فترة الاختبارات' : 'الوقت المتبقي للاختبارات النهائية'}
            </p>
            {!cd.done && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge className="bg-primary text-primary-foreground">
                  {fmtAr(cd.months, 'شهر', 'شهران', 'أشهر', 'شهر')}
                </Badge>
                <Badge className="bg-primary text-primary-foreground">
                  {fmtAr(cd.days, 'يوم', 'يومان', 'أيام', 'يوم')}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {String(cd.hours).padStart(2, '0')}:
                  {String(cd.minutes).padStart(2, '0')}:
                  {String(cd.seconds).padStart(2, '0')}
                </Badge>
              </div>
            )}
          </div>
          <a href={examInfo.countdownLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              العد التنازلي الكامل
            </Button>
          </a>
        </div>
      </Card>

      {/* Quick access */}
      <section>
        <h3 className="text-lg font-bold mb-3">وصول سريع</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickCards.map((c) => (
            <button
              key={c.label}
              onClick={() => setActiveTab(c.tab)}
              className="card-hover text-right"
            >
              <Card className="p-4 h-full hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <c.icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.desc}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h3 className="text-lg font-bold mb-3">أقسام الخطة الدراسية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cats.map((cat) => {
            const m = categoryMeta[cat];
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubject(null);
                  setActiveTab('subjects');
                }}
                className="card-hover text-right"
              >
                <Card className="p-4 hover:border-primary/40 hover:shadow-md flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{m.label}</p>
                      <Badge variant="outline" className="shrink-0">{m.hours} ساعة</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.description}</p>
                  </div>
                  <ArrowLeft className="size-4 text-muted-foreground shrink-0" />
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      {/* Welcome speech */}
      <Card className="p-5 sm:p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>🌿</span> كلمة ترحيبية
        </h3>
        <div className="msg-prose text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
          {welcomeSpeech}
        </div>
      </Card>

      {/* Welcome messages from contributors */}
      <Card className="p-5 sm:p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>✨</span> رسائل من المساهمين
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {welcomeMessages.map((w, i) => (
            <button
              key={w.id}
              onClick={() => setWelcomeIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                welcomeIdx === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
        <div
          className="msg-prose text-sm sm:text-base leading-relaxed text-foreground/90 max-h-[420px] overflow-y-auto scroll-thin pl-1"
          dangerouslySetInnerHTML={{ __html: welcomeMessages[welcomeIdx]?.contentHtml ?? '' }}
        />
      </Card>
    </div>
  );
}
