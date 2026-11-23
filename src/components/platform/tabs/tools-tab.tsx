'use client';

import { useState } from 'react';
import {
  Calculator, Wallet, GraduationCap, NotebookPen, CalendarClock, Timer,
  Layers, FileQuestion, BookText, FileText, Ruler, BarChart3, Bot,
  Search, ArrowRight, X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlatformStore } from '@/lib/store';
import { ScientificCalculator } from '../tools/scientific-calculator';
import { FinancialCalculator } from '../tools/financial-calculator';
import { GpaCalculator } from '../tools/gpa-calculator';
import { StudyOrganizer } from '../tools/study-organizer';
import { PomodoroTimer } from '../tools/pomodoro-timer';
import { Flashcards } from '../tools/flashcards';
import { QuizTool } from '../tools/quiz-tool';
import { Dictionary } from '../tools/dictionary';
import { UnitConverter } from '../tools/unit-converter';
import { AchievementDashboard } from '../tools/achievement-dashboard';
import { FileReaderTool } from '../tools/file-reader';

type ToolId =
  | 'scientific' | 'financial' | 'gpa' | 'organizer' | 'pomodoro'
  | 'flashcards' | 'quiz' | 'reader' | 'dict' | 'units' | 'stats';

interface Tool {
  id: ToolId;
  name: string;
  desc: string;
  icon: typeof Calculator;
  category: string;
  color: string;
}

const CATEGORIES = [
  'الأدوات الحسابية',
  'أدوات الدراسة والتنظيم',
  'أدوات القراءة والملفات',
  'أدوات الاختبارات والمراجعة',
  'الأدوات الشخصية للطالب',
];

const TOOLS: Tool[] = [
  { id: 'scientific', name: 'الحاسبة العلمية', desc: 'دوال مثلثية، لوغاريتمات، عاملي، ثوابت، سجل عمليات وذاكرة', icon: Calculator, category: 'الأدوات الحسابية', color: 'text-emerald-600 bg-emerald-500/10' },
  { id: 'financial', name: 'الحاسبة المالية والمحاسبية', desc: 'خصومات، ضريبة قيمة مضافة، هامش ربح، نقطة تعادل، فائدة بسيطة ومركبة', icon: Wallet, category: 'الأدوات الحسابية', color: 'text-amber-600 bg-amber-500/10' },
  { id: 'gpa', name: 'حاسبة المعدل الأكاديمي', desc: 'المعدل الفصلي والتراكمي مع دعم أنظمة درجات مختلفة', icon: GraduationCap, category: 'الأدوات الحسابية', color: 'text-violet-600 bg-violet-500/10' },
  { id: 'organizer', name: 'منظم الدراسة', desc: 'جدول أسبوعي، مواعيد الاختبارات، الواجبات وتحديد الأولويات', icon: CalendarClock, category: 'أدوات الدراسة والتنظيم', color: 'text-rose-600 bg-rose-500/10' },
  { id: 'pomodoro', name: 'مؤقت الدراسة (بومودورو)', desc: 'تركيز واستراحة، تسجيل الجلسات وإحصائيات ساعات الدراسة', icon: Timer, category: 'أدوات الدراسة والتنظيم', color: 'text-sky-600 bg-sky-500/10' },
  { id: 'reader', name: 'قارئ الملفات', desc: 'معاينة PDF، بحث داخل النص، تحديد صفحات مهمة ومشاركة الروابط', icon: FileText, category: 'أدوات القراءة والملفات', color: 'text-teal-600 bg-teal-500/10' },
  { id: 'flashcards', name: 'البطاقات التعليمية', desc: 'بطاقات سؤال وجواب مصنفة، مراجعة عشوائية ومستوى إتقان', icon: Layers, category: 'أدوات الاختبارات والمراجعة', color: 'text-fuchsia-600 bg-fuchsia-500/10' },
  { id: 'quiz', name: 'الاختبارات التفاعلية', desc: 'اختيار من متعدد وصح/خطأ مع شرح الإجابة وحفظ النتائج', icon: FileQuestion, category: 'أدوات الاختبارات والمراجعة', color: 'text-orange-600 bg-orange-500/10' },
  { id: 'dict', name: 'القاموس الأكاديمي', desc: 'مصطلحات مصنفة حسب التخصص مع أمثلة وإضافة مصطلحات جديدة', icon: BookText, category: 'الأدوات الشخصية للطالب', color: 'text-indigo-600 bg-indigo-500/10' },
  { id: 'units', name: 'محول الوحدات', desc: 'طول، وزن، حجم، سرعة، مساحة ودرجة حرارة', icon: Ruler, category: 'الأدوات الشخصية للطالب', color: 'text-cyan-600 bg-cyan-500/10' },
  { id: 'stats', name: 'لوحة إنجاز الطالب', desc: 'المهام، ساعات الدراسة، المفضلة، آخر الملفات والملاحظات', icon: BarChart3, category: 'الأدوات الشخصية للطالب', color: 'text-lime-600 bg-lime-500/10' },
];

export function ToolsTab() {
  const [active, setActive] = useState<ToolId | null>(null);
  const [q, setQ] = useState('');
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  if (active) {
    const tool = TOOLS.find((t) => t.id === active)!;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tool.color}`}>
              <tool.icon className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{tool.name}</h2>
              <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActive(null)}>
            <X className="size-4 ml-1" /> رجوع للأدوات
          </Button>
        </div>
        <ToolRenderer id={active} />
      </div>
    );
  }

  const filtered = q.trim()
    ? TOOLS.filter((t) => t.name.includes(q) || t.desc.includes(q))
    : TOOLS;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">مركز التطبيقات والأدوات الأكاديمية</h2>
        <p className="text-sm text-muted-foreground">
          مجموعة أدوات مجانية تساعدك في الحساب والتنظيم والمراجعة — كلها تعمل فعلياً.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن أداة..."
          className="pr-9 max-w-md"
        />
      </div>

      {/* AI assistant CTA */}
      <Card className="p-4 border-primary/30 bg-primary/5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Bot className="size-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">المساعد الأكاديمي الذكي</p>
          <p className="text-xs text-muted-foreground">تلخيص، شرح، توليد اختبارات، خطط مذاكرة والمزيد</p>
        </div>
        <Button size="sm" onClick={() => setActiveTab('assistant')}>
          فتح <ArrowRight className="size-4 mr-1 rotate-180" />
        </Button>
      </Card>

      {CATEGORIES.map((cat) => {
        const tools = filtered.filter((t) => t.category === cat);
        if (tools.length === 0) return null;
        return (
          <section key={cat}>
            <h3 className="text-base font-bold mb-2.5 flex items-center gap-2">
              <Badge variant="secondary">{tools.length}</Badge> {cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.map((t) => (
                <button key={t.id} onClick={() => setActive(t.id)} className="card-hover text-right">
                  <Card className="p-4 h-full hover:border-primary/40 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.color}`}>
                        <t.icon className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        فتح الأداة <ArrowRight className="size-3.5 rotate-180" />
                      </span>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          لا توجد أدوات مطابقة لبحثك.
        </Card>
      )}
    </div>
  );
}

function ToolRenderer({ id }: { id: ToolId }) {
  switch (id) {
    case 'scientific':
      return <ScientificCalculator />;
    case 'financial':
      return <FinancialCalculator />;
    case 'gpa':
      return <GpaCalculator />;
    case 'organizer':
      return <StudyOrganizer />;
    case 'pomodoro':
      return <PomodoroTimer />;
    case 'flashcards':
      return <Flashcards />;
    case 'quiz':
      return <QuizTool />;
    case 'reader':
      return <FileReaderTool />;
    case 'dict':
      return <Dictionary />;
    case 'units':
      return <UnitConverter />;
    case 'stats':
      return <AchievementDashboard />;
    default:
      return null;
  }
}
