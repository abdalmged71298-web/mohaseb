'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowRight, Heart, MessageSquare, Eye, Trash2, Pin, Send } from 'lucide-react';
import { allSubjects } from '@/lib/platform-data';
import { toast } from 'sonner';
import { useRealtimeEvents, RT_EVENTS, useVisiblePolling } from './use-member';

const CATS = ['عام', ...allSubjects.map((s) => s.title).slice(0, 30)];

export function CommunityDiscussions({ memberId }: { memberId: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [feed, setFeed] = useState<'all' | 'top'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ feed, ...(category !== 'all' ? { category } : {}) });
    const r = await fetch(`/api/community/posts?${params}`, { credentials: 'include' });
    const d = await r.json();
    setPosts(d.posts || []);
    setLoading(false);
  }, [feed, category]);

  useEffect(() => { load(); }, [load]);

  // Background polling: refresh posts every 5s while the tab is visible
  // (fast fallback on hosts without WebSocket, e.g. Vercel serverless).
  useVisiblePolling(load, 5000, [load]);

  // Real-time: new post → prepend (dedup by id); like → update count; comment → bump count
  useRealtimeEvents({
    [RT_EVENTS.POST_NEW]: (payload: any) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === payload.post.id)) return prev;
        return [payload.post, ...prev];
      });
    },
    [RT_EVENTS.LIKE_UPDATE]: (payload: any) => {
      setPosts((prev) => prev.map((p) => p.id === payload.postId ? { ...p, _count: { ...p._count, likes: payload.count } } : p));
    },
    [RT_EVENTS.COMMENT_NEW]: (payload: any) => {
      setPosts((prev) => prev.map((p) => p.id === payload.postId ? { ...p, _count: { ...p._count, comments: (p._count?.comments || 0) + 1 } } : p));
    },
  }, []);

  if (selected) {
    return <PostDetail id={selected} memberId={memberId} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">النقاشات</h3>
        <Button size="sm" onClick={() => setCreating((c) => !c)}><Plus className="size-4 ml-1" /> منشور جديد</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 30)}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={feed === 'all' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFeed('all')}>الأحدث</Button>
          <Button size="sm" variant={feed === 'top' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFeed('top')}>الأكثر تفاعلاً</Button>
        </div>
      </div>

      {creating && <CreatePost onCreated={() => { setCreating(false); load(); }} memberId={memberId} />}

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
      ) : posts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">لا توجد نقاشات بعد. ابدأ أول نقاش!</Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} className="w-full text-right card-hover">
              <Card className="p-4 hover:border-primary/40 hover:shadow-md">
                {p.pinned && <Badge className="mb-1 text-[10px]"><Pin className="size-2.5 ml-0.5" /> مثبت</Badge>}
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{p.content}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                  <span>{p.author?.displayName}</span>
                  <span className="flex items-center gap-0.5"><Heart className={`size-3 ${p.liked ? 'fill-current text-rose-500' : ''}`} /> {p._count?.likes || 0}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="size-3" /> {p._count?.comments || 0}</span>
                  <span className="flex items-center gap-0.5"><Eye className="size-3" /> {p.views || 0}</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePost({ onCreated, memberId }: { onCreated: () => void; memberId: string }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('عام');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) { toast.error('العنوان والمحتوى مطلوبان'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/community/posts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success('نُشر المنشور');
      onCreated();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">منشور جديد</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان النقاش" maxLength={120} />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب محتوى النقاش..." rows={4} />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 30)}</SelectItem>)}</SelectContent>
      </Select>
      <Button onClick={submit} disabled={busy} size="sm">{busy ? 'جارٍ النشر...' : 'نشر'}</Button>
    </Card>
  );
}

function PostDetail({ id, memberId, onBack }: { id: string; memberId: string; onBack: () => void }) {
  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`/api/community/posts/${id}`, { credentials: 'include' });
    const d = await r.json();
    setPost(d.post);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: live comments + likes on this post
  useRealtimeEvents({
    [RT_EVENTS.COMMENT_NEW]: (payload: any) => {
      if (payload.postId !== id) return;
      setPost((p: any) => p ? { ...p, comments: [...(p.comments || []), payload.comment] } : p);
    },
    [RT_EVENTS.LIKE_UPDATE]: (payload: any) => {
      if (payload.postId !== id) return;
      setPost((p: any) => p ? { ...p, _count: { ...p._count, likes: payload.count } } : p);
    },
  }, [id]);

  const like = async () => {
    const r = await fetch(`/api/community/posts/${id}/like`, { method: 'POST', credentials: 'include' });
    const d = await r.json();
    setPost((p: any) => p ? { ...p, liked: d.liked, _count: { ...p._count, likes: (p._count?.likes || 0) + (d.liked ? 1 : -1) } } : p);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const r = await fetch(`/api/community/posts/${id}/comments`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    });
    const d = await r.json();
    if (r.ok) { setComment(''); setPost((p: any) => p ? { ...p, comments: [...(p.comments || []), d.comment] } : p); }
  };

  const del = async () => {
    if (!confirm('حذف هذا المنشور؟')) return;
    const r = await fetch(`/api/community/posts/${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { toast.success('حُذف'); onBack(); }
  };

  if (!post) return <Card className="p-6 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>;

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowRight className="size-4 rotate-180 ml-1" /> رجوع</Button>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-1 text-[10px]">{post.category}</Badge>
            <h2 className="text-lg font-bold">{post.title}</h2>
          </div>
          {post.authorId === memberId && <Button variant="ghost" size="icon" className="size-8" onClick={del}><Trash2 className="size-4 text-destructive" /></Button>}
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <button onClick={like} className="flex items-center gap-1 text-sm">
            <Heart className={`size-4 ${post.liked ? 'fill-current text-rose-500' : ''}`} />
            <span>{post._count?.likes || 0}</span>
          </button>
          <span className="flex items-center gap-1 text-sm text-muted-foreground"><MessageSquare className="size-4" /> {post._count?.comments || 0}</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground"><Eye className="size-4" /> {post.views}</span>
          <span className="text-[11px] text-muted-foreground mr-auto">{post.author?.displayName}</span>
        </div>
      </Card>

      {/* Comments */}
      <Card className="p-4">
        <p className="font-semibold text-sm mb-3">التعليقات ({post.comments?.length || 0})</p>
        <div className="space-y-2 mb-3">
          {(post.comments || []).map((c: any) => (
            <div key={c.id} className="p-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: c.author?.avatarColor }} />
                <span className="text-xs font-medium">{c.author?.displayName}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString('ar')}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
          {(post.comments || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">لا تعليقات بعد</p>}
        </div>
        <div className="flex gap-2">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تعليقاً..." onKeyDown={(e) => e.key === 'Enter' && addComment()} />
          <Button size="icon" onClick={addComment}><Send className="size-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
