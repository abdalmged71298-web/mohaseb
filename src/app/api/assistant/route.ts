import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import {
  allSubjects,
  allFiles,
  categoryMeta,
  platformMeta,
} from '@/lib/platform-data';

// Simple keyword extraction (Arabic-aware basic normalization)
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

قواعد صارمة:
1. أجب بالعربية الفصيحة الواضحة.
2. اعتمد فقط على السياق المقدّم من بيانات المنصة. لا تختلق أرقام صفحات أو ملفات غير موجودة.
3. إذا لم تجد الإجابة في البيانات، وضّح ذلك بصراحة ولا تخترع معلومات.
4. عند الإشارة لملف أو مادة، اذكر اسمها كما هو وارد في البيانات.
5. كن مختصراً ومفيداً، واستخدم النقاط عند الحاجة.
6. لا تكشف أي مفاتيح أو تفاصيل تقنية داخلية.

البيانات المتاحة: ${allSubjects.length} مادة موزعة على 4 أقسام (${Object.values(categoryMeta).map((c) => c.label).join('، ')})، وآلاف الملفات (فيديوهات، كتب، نماذج، ملخصات، قنوات تليجرام، أدلة مذاكرة).`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = (body?.message ?? '').toString().slice(0, 2000);
    const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body?.history)
      ? body.history.slice(-10)
      : [];

    if (!message.trim()) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }

    // RAG: retrieve relevant platform data
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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT + context },
        ...history,
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'عذراً، لم أتمكن من توليد إجابة. حاول إعادة صياغة سؤالك.';

    return NextResponse.json({
      reply,
      sources: {
        subjects: subjects.map((s) => ({ id: s.id, title: s.title, category: s.category, categoryLabel: s.categoryLabel })),
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
