'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { platformMeta } from '@/lib/platform-data';
import { toast } from 'sonner';

const MSG_TYPES = [
  'اقتراح تطوير',
  'مشكلة تقنية',
  'استفسار',
  'ملاحظة على المحتوى',
  'طلب إضافة مقرر أو ملف',
  'شكوى',
  'أخرى',
];

export function FeedbackTab() {
  const [name, setName] = useState('');
  const [type, setType] = useState(MSG_TYPES[0]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const buildMessage = () => {
    const lines = [
      '*رسالة من بوابة دليل الطالب*',
      '',
      `النوع: ${type}`,
      name.trim() ? `الاسم: ${name.trim()}` : 'الاسم: (لم يُحدد)',
      title.trim() ? `العنوان: ${title.trim()}` : '',
      details.trim() ? `التفاصيل:\n${details.trim()}` : '',
      rating > 0 ? `تقييم المنصة: ${rating}/10` : '',
      '',
      '_أُرسلت من نموذج المنصة_',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const send = () => {
    if (!title.trim() && !details.trim()) {
      toast.error('يرجى إدخال عنوان أو تفاصيل الرسالة');
      return;
    }
    const text = buildMessage();
    const url = `https://wa.me/${platformMeta.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('يتم فتح واتساب لإرسال الرسالة');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-5 text-primary" />
          <h2 className="text-lg font-bold">شاركنا رأيك</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          ملاحظاتك واقتراحاتك تساعدنا على تطوير المنصة. تُرسل رسالتك عبر واتساب لمسؤول البوابة {platformMeta.adminName}.
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">الاسم (اختياري)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (يمكن تركه فارغاً)" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">نوع الرسالة</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MSG_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">عنوان الرسالة</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان مختصر" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">التفاصيل</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب اقتراحك أو استفسارك أو المشكلة بالتفصيل..."
              rows={5}
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">تقييم المنصة (من 1 إلى 10)</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center text-sm font-semibold transition-all ${
                    (hover || rating) >= n
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'bg-card border-border text-muted-foreground hover:border-amber-400'
                  }`}
                  aria-label={`${n} من 10`}
                >
                  {n}
                </button>
              ))}
              {rating > 0 && (
                <Badge variant="secondary" className="mr-2">
                  <Star className="size-3 ml-1 fill-current" /> {rating}/10
                </Badge>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2">
            <AlertCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              عند الضغط على «إرسال»، تُجهّز رسالتك ويُفتح واتساب لمراجعتها وإرسالها بنفسك.
              لا يتم الإرسال تلقائياً.
            </p>
          </div>

          <Button onClick={send} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="size-4 ml-2" /> إرسال عبر واتساب
          </Button>
        </div>
      </Card>
    </div>
  );
}
