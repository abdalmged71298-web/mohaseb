'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CheckCircle2, Clock, Star, FileText, NotebookPen, Layers, Award } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { stats as platformStats } from '@/lib/platform-data';

export function AchievementDashboard() {
  const todos = usePlatformStore((s) => s.todos);
  const sessions = usePlatformStore((s) => s.sessions);
  const favorites = usePlatformStore((s) => s.favorites);
  const recents = usePlatformStore((s) => s.recents);
  const notes = usePlatformStore((s) => s.notes);
  const flashcards = usePlatformStore((s) => s.flashcards);
  const quizResults = usePlatformStore((s) => s.quizResults);
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  const todosDone = todos.filter((t) => t.done).length;
  const totalTodos = todos.length;
  const todoPct = totalTodos > 0 ? Math.round((todosDone / totalTodos) * 100) : 0;

  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const hours = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;

  const masteredCards = flashcards.filter((f) => f.mastery === 3).length;
  const cardPct = flashcards.length > 0 ? Math.round((masteredCards / flashcards.length) * 100) : 0;

  const avgQuiz = quizResults.length > 0
    ? Math.round(quizResults.reduce((a, r) => a + (r.correct / r.total) * 100, 0) / quizResults.length)
    : 0;

  const cards = [
    { icon: CheckCircle2, label: 'المهام المكتملة', value: `${todosDone}/${totalTodos}`, pct: todoPct, color: 'text-emerald-600 bg-emerald-500/10', tab: 'tools' as const },
    { icon: Clock, label: 'ساعات الدراسة', value: `${hours}س ${remMin}د`, pct: Math.min(100, Math.round((totalMin / (25 * 60)) * 100)), color: 'text-sky-600 bg-sky-500/10', tab: 'tools' as const },
    { icon: Star, label: 'الملفات المفضلة', value: `${favorites.length}`, pct: Math.min(100, Math.round((favorites.length / 30) * 100)), color: 'text-amber-600 bg-amber-500/10', tab: 'library' as const },
    { icon: FileText, label: 'ملفات مفتوحة حديثاً', value: `${recents.length}`, pct: Math.min(100, Math.round((recents.length / 30) * 100)), color: 'text-teal-600 bg-teal-500/10', tab: 'library' as const },
    { icon: NotebookPen, label: 'الملاحظات', value: `${notes.length}`, pct: Math.min(100, Math.round((notes.length / 20) * 100)), color: 'text-violet-600 bg-violet-500/10', tab: 'notes' as const },
    { icon: Layers, label: 'البطاقات المتقنة', value: `${masteredCards}/${flashcards.length}`, pct: cardPct, color: 'text-fuchsia-600 bg-fuchsia-500/10', tab: 'tools' as const },
    { icon: Award, label: 'متوسط الاختبارات', value: `${avgQuiz}%`, pct: avgQuiz, color: 'text-orange-600 bg-orange-500/10', tab: 'tools' as const },
    { icon: BarChart3, label: 'مواد المنصة', value: `${platformStats.subjects}`, pct: 100, color: 'text-lime-600 bg-lime-500/10', tab: 'subjects' as const },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-lime-600" />
        <h3 className="font-bold">لوحة إنجاز الطالب</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <button key={i} onClick={() => setActiveTab(c.tab)} className="text-right card-hover">
            <Card className="p-4 hover:border-primary/40 hover:shadow-md h-full">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.color}`}>
                <c.icon className="size-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold mt-0.5">{c.value}</p>
              <Progress value={c.pct} className="h-1.5 mt-2" />
            </Card>
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="p-4">
        <p className="font-semibold text-sm mb-3">النشاط الأخير</p>
        <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
          {recents.length === 0 && sessions.length === 0 && notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا يوجد نشاط مسجل بعد. ابدأ بفتح ملف أو تدوين ملاحظة أو جلسة دراسة.
            </p>
          ) : (
            <>
              {recents.slice(0, 5).map((r, i) => (
                <div key={`r${i}`} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                  <FileText className="size-4 text-teal-600 shrink-0" />
                  <span className="truncate flex-1">{r.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{r.subjectTitle.slice(0, 20)}</span>
                </div>
              ))}
              {sessions.slice(0, 5).map((s, i) => (
                <div key={`s${i}`} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                  <Clock className="size-4 text-sky-600 shrink-0" />
                  <span className="truncate flex-1">{s.subject}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{s.minutes} دقيقة</span>
                </div>
              ))}
              {notes.slice(0, 5).map((n, i) => (
                <div key={`n${i}`} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                  <NotebookPen className="size-4 text-violet-600 shrink-0" />
                  <span className="truncate flex-1">{n.title || 'ملاحظة بلا عنوان'}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{n.category}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          تُحفظ بياناتك محلياً في متصفحك فقط. مسح بيانات المتصفح يفقدها، وهي لا تتم مزامنتها بين الأجهزة.
        </p>
      </Card>
    </div>
  );
}
