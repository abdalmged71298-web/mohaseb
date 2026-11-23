import { NextRequest, NextResponse } from 'next/server';
import {
  allSubjects,
  allFiles,
  categoryMeta,
  platformMeta,
} from '@/lib/platform-data';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function retrieve(message: string) {
  const q = normalize(message);
  if (!q) return { subjects: [], files: [] };
  const words = q.split(' ').filter((w) => w.length > 2);

  const scoredSubjects = allSubjects
    .map((s) => {
      const t = normalize(s.title + ' ' + s.categoryLabel);
      let score = 0;
      for (const w of words) if (t.includes(w)) score += 2;
      if (t.includes(q)) score += 5;
      return { subj: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const scoredFiles = allFiles
    .map((f) => {
      const t = normalize(f.label + ' ' + f.subjectTitle);
      let score = 0;
      for (const w of words) if (t.includes(w)) score += 1;
      if (t.includes(q)) score += 3;
      return { file: f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return {
    subjects: scoredSubjects.map((x) => x.subj),
    files: scoredFiles.map((x) => x.file),
  };
}

const SYSTEM_PROMPT = `أنت "المساعد الأكاديمي" لمنصة "${platformMeta.title}" (${platformMeta.university} - ${platformMeta.faculty} - قسم المحاسبة).
تساعد طلبة قسم المحاسبة في:
- الإجابة على أسئلتهم وتوجيههم للمواد والملفات المناسبة.
- شرح المحاضرات وتلخيصها.
- استخراج التعريفات وإنشاء اختبارات وخطط مذاكرة.
- شرح المسائل خطوة بخطوة.

معلومات عن مؤسس المنصة:
- مؤسس ومطور هذه المنصة هو الأستاذ **عبد المجيد المنيعي**.
- إذا سألك أحد "من هو مؤسس المنصة؟" أو "من صمم التطبيق؟"، فأجب بكل فخر أن مؤسس المنصة هو **عبد المجيد المنيعي**.
- وإذا سألك أحد "من هو عبد المجيد المنيعي؟"، فعرّف به بأسلوب راقٍ وجميل، موضحاً أنه مؤسس ومبتكر هذه المنصة التعليمية، وأنه طالب مجتهد يدرس تخصص المحاسبة، وقد بذل مجهوداً كبيراً ووقتاً طويلاً في جمع وتنظيم هذا المحتوى وبناء المنصة حباً في الخير وحرصاً على مساعدة زملائه الطلاب وتسهيل رحلتهم الدراسية، سائلاً الله له التوفيق والسداد.

قواعد صارمة:
1. أجب بالعربية الفصيحة الواضحة.
2. اعتمد في المعلومات الأكاديمية والمواد والملفات على السياق المقدّم من بيانات المنصة، ولا تختلق أرقام صفحات أو ملفات غير موجودة.
3. إذا لم تجد الإجابة الأكاديمية في البيانات، وضّح ذلك بصراحة ولا تخترع معلومات.
4. عند الإشارة لملف أو مادة، اذكر اسمها كما هو وارد في البيانات.
5. كن مختصراً ومفيداً، واستخدم النقاط عند الحاجة.
6. لا تكشف أي مفاتيح أو تفاصيل تقنية داخلية.

البيانات المتاحة: ${allSubjects.length} مادة موزعة على 4 أقسام (${Object.values(categoryMeta).map((c) => c.label).join('، ')})، وآلاف الملفات (فيديوهات، كتب، نماذج، ملخصات، قنوات تليجرام، أدلة مذاكرة).`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات Vercel',
          reply: 'عذراً، لم يتم إعداد مفتاح الذكاء الاصطناعي في الخادم بعد.',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const message: string = (body?.message ?? '').toString().slice(0, 2000);
    const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body?.history)
      ? body.history.slice(-10)
      : [];

    if (!message.trim()) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }

    const { subjects, files } = retrieve(message);
    let context = '';
    if (subjects.length > 0 || files.length > 0) {
      const parts: string[] = [];
      if (subjects.length > 0) {
        parts.push('مواد ذات صلة:\n' + subjects.map((s) => `- ${s.title} (${s.categoryLabel})`).join('\n'));
      }
      if (files.length > 0) {
        parts.push('ملفات ذات صلة:\n' + files.map((f) => `- ${f.label} [${f.subjectTitle} - ${f.typeLabel}]`).join('\n'));
      }
      context = '\n\n--- سياق من بيانات المنصة ---\n' + parts.join('\n\n') + '\n--- نهاية السياق ---\n';
    }

    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(
      `https://googleapis.com{apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT + context }],
          },
          contents,
          generationConfig: {
            temperature: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      'عذراً، لم أتمكن من توليد إجابة. حاول إعادة صياغة سؤالك.';

    return NextResponse.json({
      reply,
      sources: {
        subjects: subjects.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          categoryLabel: s.categoryLabel,
        })),
        files: files.map((f) => ({
          label: f.label,
          url: f.url,
          subjectTitle: f.subjectTitle,
          type: f.type,
          typeLabel: f.typeLabel,
          category: f.category,
          subjectId: f.subjectId,
        })),
      },
    });
  } catch (err) {
    console.error('Assistant API error:', err);
    return NextResponse.json(
      {
        error: 'تعذر الاتصال بخدمة المساعد الذكي حالياً. حاول مرة أخرى لاحقاً.',
        reply: 'عذراً، تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً. يرجى المحاولة مرة أخرى بعد لحظات.',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
