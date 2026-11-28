'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, HelpCircle } from 'lucide-react';

type Sub = 'home' | 'discussions' | 'questions' | 'messages' | 'groups' | 'polls' | 'notifications' | 'profile' | 'search';

export function CommunitySearch({ q, memberId, onNavigate }: { q: string; memberId: string; onNavigate: (s: Sub) => void }) {
  const [data, setData] = useState<{ members: any[]; posts: any[]; questions: any[] }>({ members: [], posts: [], questions: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setData({ members: [], posts: [], questions: [] }); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/community/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setData({ members: d.members || [], posts: d.posts || [], questions: d.questions || [] });
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-3">
      {loading && <Card className="p-4 text-center text-sm text-muted-foreground">جارٍ البحث...</Card>}
      {!loading && data.members.length === 0 && data.posts.length === 0 && data.questions.length === 0 && q.length >= 2 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا نتائج لـ «{q}»</Card>
      )}

      {data.members.length > 0 && (
        <Section title="طلاب" icon={<Mail className="size-4 text-primary" />}>
          {data.members.map((m) => (
            <button key={m.id} onClick={() => onNavigate('messages')} className="w-full text-right p-2 rounded-lg hover:bg-muted flex items-center gap-2">
              <div className="w-7 h-7 rounded-full" style={{ backgroundColor: m.avatarColor }} />
              <div className="min-w-0"><p className="text-sm font-medium truncate">{m.displayName}</p><p className="text-[11px] text-muted-foreground">{m.level}</p></div>
            </button>
          ))}
        </Section>
      )}
      {data.posts.length > 0 && (
        <Section title="نقاشات" icon={<MessageSquare className="size-4 text-primary" />}>
          {data.posts.map((p) => (
            <button key={p.id} onClick={() => onNavigate('discussions')} className="w-full text-right p-2 rounded-lg hover:bg-muted">
              <p className="text-sm font-medium truncate">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.category}</p>
            </button>
          ))}
        </Section>
      )}
      {data.questions.length > 0 && (
        <Section title="أسئلة" icon={<HelpCircle className="size-4 text-primary" />}>
          {data.questions.map((q) => (
            <button key={q.id} onClick={() => onNavigate('questions')} className="w-full text-right p-2 rounded-lg hover:bg-muted">
              <p className="text-sm font-medium truncate">{q.title}</p>
              <p className="text-[11px] text-muted-foreground">{q.subject} · {q.status === 'solved' ? 'تم الحل' : q.status === 'answered' ? 'تمت الإجابة' : 'بانتظار الإجابة'}</p>
            </button>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-3">
      <p className="font-semibold text-xs mb-2 flex items-center gap-1.5">{icon}{title}</p>
      <div className="space-y-1">{children}</div>
    </Card>
  );
}
