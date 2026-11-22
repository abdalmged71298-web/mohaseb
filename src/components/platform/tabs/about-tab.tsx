'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, Database, Bot, Code2, Heart } from 'lucide-react';
import { platformMeta, stats } from '@/lib/platform-data';
import { usePlatformStore } from '@/lib/store';

export function AboutTab() {
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  const features = [
    { icon: Database, title: 'مكتبة منظمة', desc: `${stats.subjects} مادة و${stats.files} ملف مصنفة وفق الخطة الدراسية.` },
    { icon: Bot, title: 'مساعد ذكي', desc: 'يربط بيانات المنصة بنموذج ذكاء اصطناعي عبر نظام RAG للإجابة المبنية على المحتوى.' },
    { icon: Code2, title: 'أدوات دراسية', desc: `${stats.tools} أداة: حاسبة علمية، مالية، معدل، بطاقات، اختبارات، مؤقت وأكثر.` },
    { icon: ShieldCheck, title: 'أمان وخصوصية', desc: 'لا مفاتيح API في الواجهة، بياناتك المحلية محفوظة في متصفحك فقط.' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Card className="p-6 header-gradient text-primary-foreground">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl ring-1 ring-white/25 shrink-0">
            📊
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold">{platformMeta.title}</h2>
            <p className="text-sm opacity-90 mt-1">{platformMeta.subtitle}</p>
            <p className="text-xs opacity-75 mt-1">
              {platformMeta.university} — {platformMeta.faculty} | {platformMeta.department}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-3">عن المنصة</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          منصة أكاديمية ذكية أعيد بناؤها من نسخة HTML الأصلية لبوابة دليل الطالب قسم المحاسبة،
          بهدف تنظيم المكتبة التعليمية وتوفير أدوات دراسية ومساعد ذكي ودفتر ملاحظات لطلبة القسم.
          حُفظت جميع البيانات الأصلية كاملةً (المواد، الملفات، الروابط، الإعلانات، رسائل الخريجين،
          بيانات التواصل) دون أي حذف أو اختصار، ونُظّمت في واجهة عربية متجاوبة تدعم الوضع الليلي.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => (
          <Card key={f.title} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Lock className="size-4 text-primary" /> الخصوصية والأمان
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary">•</span> تُحفظ ملاحظاتك ومفضلتك وسجل دراستك محلياً في متصفحك فقط، ولا تُرسل لأي خادم.</li>
          <li className="flex gap-2"><span className="text-primary">•</span> يعمل المساعد الذكي عبر واجهة خلفية آمنة دون كشف مفاتيح الخدمة.</li>
          <li className="flex gap-2"><span className="text-primary">•</span> تُفتح ملفات المكتبة من مصادرها الأصلية (Google Drive وYouTube وTelegram) دون وسطاء.</li>
          <li className="flex gap-2"><span className="text-primary">•</span> الحاسبة العلمية تستخدم محلل تعابير آمن (Shunting-Yard) دون استخدام <code className="text-xs bg-muted px-1 rounded">eval</code>.</li>
          <li className="flex gap-2"><span className="text-primary">•</span> لا تُجمع بيانات الطلاب الشخصية؛ نموذج الرأي يُرسل عبر واتساب بإرادة المستخدم.</li>
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-3">التقنيات</h3>
        <div className="flex flex-wrap gap-2">
          {['Next.js 16', 'TypeScript', 'Tailwind CSS 4', 'shadcn/ui', 'Prisma', 'Zustand', 'z-ai-web-dev-sdk', 'RTL عربية'].map((t) => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          المنصة تعمل ضمن بيئة تطوير متكاملة. للنشر النهائي على استضافة، تأكد من إعداد خدمة الذكاء الاصطناعي ومتغيرات البيئة اللازمة.
        </p>
      </Card>

      <Card className="p-5 border-primary/20">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Heart className="size-6 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{platformMeta.adminName}</p>
            <p className="text-sm text-muted-foreground">{platformMeta.adminRole} — مسؤول البوابة</p>
            <p className="text-xs text-muted-foreground mt-1">
              شكراً لكل المساهمين من الطلاب والخريجين الذين شاركوا ملفاتهم وملخصاتهم.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <a href={platformMeta.whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                تواصل واتساب
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('feedback')}>
              شاركنا رأيك
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
