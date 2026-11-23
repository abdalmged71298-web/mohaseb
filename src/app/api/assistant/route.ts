import { NextRequest, NextResponse } from 'next/server';
import {
  allSubjects,
  allFiles,
  categoryMeta,
  platformMeta,
  founderInfo,
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
    .slice(0, 3);

  const scoredFiles = allFiles
    .filter((f) => f.url)
    .map((f) => {
      const t = normalize(f.label + ' ' + f.subjectTitle);
      let score = 0;
      for (const w of words) if (t.includes(w)) score += 1;
      if (t.includes(q)) score += 3;
      return { file: f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

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

البيانات المتاحة: ${allSubjects.length} مادة موزعة على 4 أقسام (${Object.values(categoryMeta).map((c) => c.label).join('، ')})، وآلاف الملفات (فيديوهات، كتب، نماذج، ملخصات، قنوات تليجرام، أدلة مذاكرة).

--- معلومات ثابتة عن مؤسس البوابة (استخدمها عند أي سؤال عن المؤسس أو المصمم أو صاحب المشروع) ---
الاسم: ${founderInfo.name}
الصفة: ${founderInfo.role}
الدراسة: ${founderInfo.study}
التعريف: ${founderInfo.bio}
المساهمون: ${founderInfo.contributors}
تنويه: ${founderInfo.disclaimer}

عندما يسأل الطالب عن مؤسس البوابة أو من صممها أو من هو ${founderInfo.name} أو صاحب فكرة المنصة أو من طور المشروع، أجب بإجابة واضحة وودية تستند فقط إلى المعلومات أعلاه، ولا تخترع تفاصيل شخصية غير مذكورة، ولا تدّعي أنه يشغل منصباً رسمياً في الجامعة، وأوضح أن البوابة مبادرة طلابية مستقلة. إذا سُئل عن معلومات غير متوفرة، وضّح أنك لا تملك معلومات مؤكدة عنها.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.AI_API_KEY || process.env.GROQ_API_KEY || '').trim();
    const rawBaseUrl = (process.env.AI_API_BASE_URL || 'https://groq.com')
      .trim()
      .replace(/\/+$/, '');
    const endpoint = rawBaseUrl.endsWith('/chat/completions')
      ? rawBaseUrl
      : `${rawBaseUrl}/chat/completions`;
    const model = (process.env.AI_MODEL || 'llama-3.3-70b-versatile').trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'AI_API_KEY missing',
          reply: 'عذراً، مفتاح AI_API_KEY غير موجود في إعدادات Vercel.',
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + context },
          ...history.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiMsg = data?.error?.message || `HTTP ${response.status}`;
      return NextResponse.json(
        {
          error: apiMsg,
          reply: `خطأ من الخادم: ${apiMsg}`,
        },
        { status: 500 }
      );
    }

    const firstChoice = Array.isArray(data?.choices) ? data.choices.at(0) : null;
    const reply =
      firstChoice?.message?.content?.trim() ||
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
  } catch (err: any) {
    console.error('Assistant API error:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Unknown error',
        reply: `خطأ تقني: ${err?.message || 'تعذر الاتصال بالخادم'}`,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
