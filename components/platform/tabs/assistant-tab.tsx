'use client';

import { Bot, Sparkles, ShieldCheck, FileSearch, BookOpen, Brain, ListChecks, HelpCircle, Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from '../assistant/chat-panel';

const CAPABILITIES = [
  { icon: FileSearch, title: 'البحث في المكتبة', desc: 'يجد المواد والملفات المناسبة من بيانات المنصة الحقيقية.' },
  { icon: BookOpen, title: 'شرح المحاضرات', desc: 'يشرح الدروس والمفاهيم المحاسبية بأسلوب واضح.' },
  { icon: Sparkles, title: 'تلخيص الملفات', desc: 'يلخّص المحتوى ويستخرج النقاط الرئيسية والتعريفات.' },
  { icon: Brain, title: 'إنشاء اختبارات', desc: 'يولّد أسئلة اختيار من متعدد وصح/خطأ للمراجعة.' },
  { icon: HelpCircle, title: 'شرح المسائل', desc: 'يحل المسائل المحاسبية خطوة بخطوة.' },
  { icon: Map, title: 'خطط مذاكرة', desc: 'يضع خطة مذاكرة مخصصة حسب وقتك وأهدافك.' },
];

export function AssistantTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 header-gradient text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25 shrink-0">
            <Bot className="size-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold">المساعد الأكاديمي الذكي</h2>
            <p className="text-sm opacity-90 mt-0.5">
              مساعد ذكي مرتبط بمكتبة المنصة — يجيب بالعربية ويعتمد على بيانات حقيقية.
            </p>
          </div>
        </div>
      </Card>

      {/* Capabilities */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CAPABILITIES.map((c) => (
          <Card key={c.title} className="p-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <c.icon className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-sm">{c.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.desc}</p>
          </Card>
        ))}
      </div>

      {/* Privacy note */}
      <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span>
            يعمل المساعد عبر خدمة خلفية آمنة. لا تُكشف مفاتيح API في الواجهة، ويتم البحث في بيانات المنصة محلياً قبل إرسال السؤال للنموذج. لا تُختلق ملفات أو أرقام صفحات غير موجودة.
          </span>
        </div>
      </Card>

      {/* Chat */}
      <Card className="p-4 h-[65vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary"><Sparkles className="size-3 ml-1" /> المحادثة</Badge>
          <span className="text-xs text-muted-foreground">اضغط Enter للإرسال</span>
        </div>
        <ChatPanel />
      </Card>
    </div>
  );
}
