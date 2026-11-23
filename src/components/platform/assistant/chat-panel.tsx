'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, BookOpen, Sparkles, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePlatformStore } from '@/lib/store';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  sources?: { subjects: any[]; files: any[] };
}

const QUICK_ACTIONS = [
  'اسأل عن تخصصي',
  'ابحث عن ملف',
  'اشرح محاضرة',
  'لخّص ملفاً',
  'اختبر معلوماتك',
  'أنشئ أسئلة',
  'اشرح مسألة',
  'أنشئ خطة مذاكرة',
  'ساعدني في استخدام المنصة',
];

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'مرحباً! أنا المساعد الأكاديمي الذكي. يمكنني مساعدتك في البحث عن المواد والملفات، شرح المحاضرات، التلخيص، إنشاء اختبارات وخطط مذاكرة، والمزيد. كيف أساعدك اليوم؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setSelectedCategory = usePlatformStore((s) => s.setSelectedCategory);
  const setSelectedSubject = usePlatformStore((s) => s.setSelectedSubject);
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const userMsg: Msg = { role: 'user', content: msg };
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      // Client-side timeout: abort after 60s so the UI never hangs forever.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({ reply: '' }));
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            data.reply ||
            'عذراً، لم أستلم رداً صالحاً من الخدمة. حاول مرة أخرى.',
          sources: data.sources,
        },
      ]);
    } catch (err: unknown) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: aborted
            ? 'استغرقت الاستجابة وقتاً طويلاً. حاول إعادة الإرسال.'
            : 'تعذر الاتصال بالمساعد. تحقق من اتصالك وحاول مرة أخرى.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openSubject = (cat: string, id: string) => {
    setSelectedCategory(cat);
    setSelectedSubject(id);
    setActiveTab('subjects');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto scroll-thin space-y-3 ${compact ? 'max-h-[50vh] p-1' : 'p-1'}`}
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'header-gradient text-primary-foreground'
              }`}
            >
              {m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div className={`flex-1 min-w-0 max-w-[85%] ${m.role === 'user' ? 'text-left' : ''}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}
              >
                {m.content}
              </div>
              {m.sources && (m.sources.subjects.length > 0 || m.sources.files.length > 0) && (
                <div className="mt-1.5 space-y-1">
                  {m.sources.subjects.slice(0, 3).map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => openSubject(s.category, s.id)}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors max-w-full"
                    >
                      <BookOpen className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{s.title}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0">{s.categoryLabel}</Badge>
                    </button>
                  ))}
                  {m.sources.files.slice(0, 4).map((f: any, j: number) => (
                    <a
                      key={j}
                      href={f.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors max-w-full"
                    >
                      <FileText className="size-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{f.typeLabel}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full header-gradient text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="size-4" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>يكتب المساعد...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 my-2">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
            >
              <Sparkles className="size-3" /> {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="اكتب سؤالك..."
          className="flex-1"
        />
        {messages.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessages([messages[0]])}
            aria-label="محادثة جديدة"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
