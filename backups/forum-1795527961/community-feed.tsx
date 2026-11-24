'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, HelpCircle, BarChart3, TrendingUp, AlertCircle, Pin } from 'lucide-react';

type Sub = 'home' | 'discussions' | 'questions' | 'messages' | 'groups' | 'polls' | 'notifications' | 'profile' | 'search';

export function CommunityFeed({ onNavigate }: { onNavigate: (s: Sub) => void }) {
  const [recent, setRecent] = useState<any[]>([]);
  const [unanswered, setUnanswered] = useState<any[]>([]);
  const [topPolls, setTopPolls] = useState<any[]>([]);
  const [pinned, setPinned] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/community/posts?limit=5').then((r) => r.json()),
        fetch('/api/community/questions?status=open&limit=5').then((r) => r.json()),
        fetch('/api/community/polls?limit=3').then((r) => r.json()),
      ]);
      setRecent(r1.posts || []);
      setUnanswered(r2.questions || []);
      setTopPolls(r3.polls || []);
      setPinned((r1.posts || []).filter((p: any) => p.pinned));
    })();
  }, []);

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ActionCard icon={MessageSquare} label="نقاش جديد" desc="شارك رأيك" onClick={() => onNavigate('discussions')} />
        <ActionCard icon={HelpCircle} label="اسأل سؤالاً" desc="احصل على إجابة" onClick={() => onNavigate('questions')} />
        <ActionCard icon={BarChart3} label="استطلاع جديد" desc="صوّت على موضوع" onClick={() => onNavigate('polls')} />
        <ActionCard icon={TrendingUp} label="المجموعات" desc="انضم لمجموعة" onClick={() => onNavigate('groups')} />
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <Section title="منشورات مثبتة" icon={<Pin className="size-4 text-primary" />}>
          {pinned.map((p) => <PostRow key={p.id} post={p} />)}
        </Section>
      )}

      {/* Recent discussions */}
      <Section title="أحدث النقاشات" icon={<MessageSquare className="size-4 text-primary" />} onMore={() => onNavigate('discussions')}>
        {recent.length === 0 ? <Empty text="لا توجد نقاشات بعد. كن أول من يبدأ!" /> : recent.map((p) => <PostRow key={p.id} post={p} />)}
      </Section>

      {/* Unanswered questions */}
      <Section title="أسئلة بانتظار الإجابة" icon={<AlertCircle className="size-4 text-amber-500" />} onMore={() => onNavigate('questions')}>
        {unanswered.length === 0 ? <Empty text="لا توجد أسئلة بدون إجابة حالياً." /> : unanswered.map((q) => (
          <button key={q.id} onClick={() => onNavigate('questions')} className="w-full text-right p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
            <p className="text-sm font-medium truncate">{q.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{q.subject} · {q.author?.displayName}</p>
          </button>
        ))}
      </Section>

      {/* Active polls */}
      {topPolls.length > 0 && (
        <Section title="استطلاعات نشطة" icon={<BarChart3 className="size-4 text-primary" />} onMore={() => onNavigate('polls')}>
          {topPolls.map((p) => (
            <button key={p.id} onClick={() => onNavigate('polls')} className="w-full text-right p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
              <p className="text-sm font-medium truncate">{p.question}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p._count?.votes || 0} صوت</p>
            </button>
          ))}
        </Section>
      )}
    </div>
  );
}

function ActionCard({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-hover text-right">
      <Card className="p-3 hover:border-primary/40 hover:shadow-md h-full">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
          <Icon className="size-5 text-primary" />
        </div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </Card>
    </button>
  );
}

function Section({ title, icon, children, onMore }: { title: string; icon?: React.ReactNode; children: React.ReactNode; onMore?: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">{icon}{title}</h3>
        {onMore && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMore}>عرض الكل</Button>}
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function PostRow({ post }: { post: any }) {
  return (
    <div className="p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
      <p className="text-sm font-medium truncate">{post.title}</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>
        <span className="text-[11px] text-muted-foreground">{post.author?.displayName}</span>
        <span className="text-[11px] text-muted-foreground">· {post._count?.comments || 0} تعليق · {post._count?.likes || 0} إعجاب</span>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{text}</p>;
}
