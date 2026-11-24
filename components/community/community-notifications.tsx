'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check } from 'lucide-react';
import { useRealtimeEvents, RT_EVENTS } from './use-member';

type Sub = 'home' | 'discussions' | 'questions' | 'messages' | 'groups' | 'polls' | 'notifications' | 'profile' | 'search';

const TYPE_LABEL: Record<string, string> = {
  answer: 'إجابة', comment: 'تعليق', like: 'إعجاب', message: 'رسالة', accepted: 'قبول', group: 'مجموعة', system: 'تنبيه',
};

export function CommunityNotifications({ onNavigate }: { onNavigate: (s: Sub) => void }) {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const r = await fetch('/api/community/notifications', { credentials: 'include' });
    const d = await r.json();
    setItems(d.notifications || []);
  };

  useEffect(() => { load(); }, []);

  // Real-time: new notification → prepend (dedup); read → mark read live
  useRealtimeEvents({
    [RT_EVENTS.NOTIFICATION_NEW]: (payload: any) => {
      setItems((prev) => {
        if (prev.some((n) => n.id === payload.notification.id)) return prev;
        return [payload.notification, ...prev];
      });
    },
    [RT_EVENTS.NOTIFICATION_READ]: (payload: any) => {
      setItems((prev) => payload.all ? prev.map((n) => ({ ...n, read: true })) : prev.map((n) => n.id === payload.id ? { ...n, read: true } : n));
    },
  }, []);

  const markOne = async (id: string) => {
    await fetch(`/api/community/notifications?id=${id}`, { method: 'PATCH', credentials: 'include' });
  };

  const markAll = async () => {
    await fetch('/api/community/notifications', { method: 'PATCH', credentials: 'include' });
    load();
  };

  const handleNotif = (n: any) => {
    // Mark as read when the user opens/views it
    if (!n.read) markOne(n.id);
    if (n.link) {
      if (n.link.includes('post')) onNavigate('discussions');
      else if (n.link.includes('question')) onNavigate('questions');
      else if (n.link.includes('chat')) onNavigate('messages');
      else if (n.link.includes('group')) onNavigate('groups');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">الإشعارات</h3>
        <Button size="sm" variant="outline" onClick={markAll}><Check className="size-3.5 ml-1" /> تعليم الكل كمقروء</Button>
      </div>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Bell className="size-8 mx-auto mb-2 opacity-40" />
          لا إشعارات حالياً
        </Card>
      ) : (
        <div className="space-y-1.5">
          {items.map((n) => (
            <button key={n.id} onClick={() => handleNotif(n)} className="w-full text-right">
              <Card className={`p-3 ${n.read ? 'opacity-60' : 'border-primary/30 bg-primary/5'}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[n.type] || n.type}</Badge>
                      <span className="text-sm font-medium">{n.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString('ar')}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
