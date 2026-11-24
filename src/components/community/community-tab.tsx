'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Home, HelpCircle, Mail, Users, BarChart3, Bell, User, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMember, usePresence, useRealtimeEvents, RT_EVENTS } from './use-member';
import { JoinGate } from './join-gate';
import { CommunityFeed } from './community-feed';
import { CommunityDiscussions } from './community-discussions';
import { CommunityQuestions } from './community-questions';
import { CommunityMessages } from './community-messages';
import { CommunityGroups } from './community-groups';
import { CommunityPolls } from './community-polls';
import { CommunityNotifications } from './community-notifications';
import { CommunityProfile } from './community-profile';
import { CommunitySearch } from './community-search';

type Sub = 'home' | 'discussions' | 'questions' | 'messages' | 'groups' | 'polls' | 'notifications' | 'profile' | 'search';

const NAV: { id: Sub; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'discussions', label: 'النقاشات', icon: MessageSquare },
  { id: 'questions', label: 'الأسئلة', icon: HelpCircle },
  { id: 'messages', label: 'المحادثات', icon: Mail },
  { id: 'groups', label: 'المجموعات', icon: Users },
  { id: 'polls', label: 'الاستطلاعات', icon: BarChart3 },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'profile', label: 'ملفي', icon: User },
];

export function CommunityTab() {
  const { member, loading, joined, refresh } = useMember();
  const online = usePresence();
  const [sub, setSub] = useState<Sub>('home');
  const [unread, setUnread] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Poll unread notifications (fast fallback) + real-time updates
  useEffect(() => {
    if (!joined) return;
    const poll = async () => {
      try {
        const r = await fetch('/api/community/notifications', { credentials: 'include' });
        const d = await r.json();
        setUnread(d.unread || 0);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [joined]);

  // Real-time: live unread counter (new notification + read events)
  useRealtimeEvents({
    [RT_EVENTS.NOTIFICATION_NEW]: () => setUnread((u) => u + 1),
    [RT_EVENTS.NOTIFICATION_READ]: (payload: any) => setUnread((u) => Math.max(0, payload.all ? 0 : u - 1)),
  }, [joined]);

  if (loading) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>;
  }

  if (!joined || !member) {
    return <JoinGate onJoined={refresh} />;
  }

  const openSearch = () => {
    setShowSearch(true);
    setSub('search');
  };

  return (
    <div className="space-y-4">
      {/* Community header */}
      <Card className="p-4 header-gradient text-primary-foreground">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Users className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg">منتدى الطالب</h2>
              <p className="text-[11px] opacity-85 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                  {online.size} متصل الآن
                </span>
                <span aria-hidden>·</span>
                <span>{member.displayName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 opacity-70 pointer-events-none" />
              <Input
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); if (!showSearch) { setShowSearch(true); setSub('search'); } }}
                onFocus={openSearch}
                placeholder="ابحث..."
                className="h-9 w-32 sm:w-44 pr-8 bg-white/15 border-white/20 text-primary-foreground placeholder:text-primary-foreground/70"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 overflow-x-auto scroll-thin pb-1">
        {NAV.map((n) => {
          const active = sub === n.id;
          const isNotif = n.id === 'notifications';
          return (
            <button
              key={n.id}
              onClick={() => { setSub(n.id); setShowSearch(false); }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary/40'
              }`}
            >
              <n.icon className="size-4" />
              <span>{n.label}</span>
              {isNotif && unread > 0 && (
                <Badge className="absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px] bg-rose-500 text-white rounded-full p-0 flex items-center justify-center">{unread}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-view */}
      {showSearch && sub === 'search' ? (
        <CommunitySearch q={searchQ} memberId={member.id} onNavigate={(s) => { setShowSearch(false); setSub(s); }} />
      ) : (
        <>
          {sub === 'home' && <CommunityFeed onNavigate={setSub} />}
          {sub === 'discussions' && <CommunityDiscussions memberId={member.id} />}
          {sub === 'questions' && <CommunityQuestions memberId={member.id} />}
          {sub === 'messages' && <CommunityMessages memberId={member.id} memberName={member.displayName} />}
          {sub === 'groups' && <CommunityGroups memberId={member.id} memberName={member.displayName} />}
          {sub === 'polls' && <CommunityPolls memberId={member.id} />}
          {sub === 'notifications' && <CommunityNotifications onNavigate={setSub} />}
          {sub === 'profile' && <CommunityProfile memberId={member.id} />}
        </>
      )}
    </div>
  );
}
