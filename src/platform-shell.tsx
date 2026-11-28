'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlatformStore, type TabId } from '@/lib/store';
import { useTheme } from 'next-themes';
import { allSubjects, searchFiles, platformMeta } from '@/lib/platform-data';
import { HomeTab } from './tabs/home-tab';
import { SubjectsTab } from './tabs/subjects-tab';
import { LibraryTab } from './tabs/library-tab';
import { FavoritesTab } from './tabs/favorites-tab';
import { AnnouncementsTab } from './tabs/announcements-tab';
import { ToolsTab } from './tabs/tools-tab';
import { NotesTab } from './tabs/notes-tab';
import { CommunityTab } from '@/components/community/community-tab';
import { AssistantTab } from './tabs/assistant-tab';
import { FeedbackTab } from './tabs/feedback-tab';
import { AboutTab } from './tabs/about-tab';
import { FloatingAssistant } from './assistant/floating-assistant';
import { FloatingTimeBar } from './floating-time-bar';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: 'home' },
  { id: 'subjects', label: 'التخصصات والمواد', icon: 'book' },
  { id: 'library', label: 'المكتبة التعليمية', icon: 'library' },
  { id: 'favorites', label: 'موادي المفضلة', icon: 'star' },
  { id: 'announcements', label: 'الإعلانات', icon: 'megaphone' },
  { id: 'tools', label: 'التطبيقات والأدوات', icon: 'wrench' },
  { id: 'notes', label: 'ملاحظاتي', icon: 'note' },
  { id: 'community', label: 'منتدى الطالب', icon: 'users' },
  { id: 'assistant', label: 'المساعد الذكي', icon: 'bot' },
  { id: 'feedback', label: 'شاركنا رأيك', icon: 'message' },
  { id: 'about', label: 'حول المنصة', icon: 'info' },
];

function TabIcon({ name }: { name: string }) {
  const map: Record<string, string> = {
    home: '🏠',
    book: '📚',
    library: '🗂️',
    star: '⭐',
    megaphone: '📢',
    wrench: '🛠️',
    note: '📝',
    users: '👥',
    bot: '🤖',
    message: '💬',
    info: 'ℹ️',
  };
  return <span className="text-base leading-none">{map[name] ?? '•'}</span>;
}

export function PlatformShell() {
  const activeTab = usePlatformStore((s) => s.activeTab);
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const libraryNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileNavOpen || activeTab !== 'library') return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!libraryNavRef.current?.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeTab, mobileNavOpen]);

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'subjects':
        return <SubjectsTab />;
      case 'library':
        return <LibraryTab />;
      case 'favorites':
        return <FavoritesTab />;
      case 'announcements':
        return <AnnouncementsTab />;
      case 'tools':
        return <ToolsTab />;
      case 'notes':
        return <NotesTab />;
      case 'community':
        return <CommunityTab />;
      case 'assistant':
        return <AssistantTab />;
      case 'feedback':
        return <FeedbackTab />;
      case 'about':
        return <AboutTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header-gradient text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 min-w-0"
              aria-label="الذهاب للرئيسية"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/25">
                <span className="text-xl">📊</span>
              </div>
              <div className="text-right min-w-0">
                <h1 className="font-bold text-sm sm:text-base leading-tight truncate">
                  {platformMeta.title}
                </h1>
                <p className="text-[11px] sm:text-xs opacity-85 truncate">
                  {platformMeta.subtitle}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="text-primary-foreground hover:bg-white/15"
                aria-label="بحث"
              >
                <Search className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-primary-foreground hover:bg-white/15"
                aria-label="تبديل المظهر"
                suppressHydrationWarning
              >
                {theme === 'dark' ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </Button>
              {activeTab === 'library' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileNavOpen((open) => !open)}
                  className="text-primary-foreground hover:bg-white/15 md:hidden"
                  aria-label="أقسام المكتبة"
                  aria-expanded={mobileNavOpen}
                  aria-controls="library-mobile-nav"
                >
                  <Menu className="size-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileNavOpen(true)}
                  className="text-primary-foreground hover:bg-white/15 md:hidden"
                  aria-label="القائمة"
                >
                  <Menu className="size-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop tab nav */}
          <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto scroll-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-primary-foreground/90 hover:bg-white/15'
                }`}
              >
                <TabIcon name={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeTab === 'library' && mobileNavOpen && (
        <nav
          id="library-mobile-nav"
          ref={libraryNavRef}
          aria-label="أقسام المنصة"
          className="fixed left-0 right-auto top-16 z-[60] w-80 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div className="px-3 py-2 text-lg font-semibold">أقسام المنصة</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right text-sm font-medium ${
                activeTab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <TabIcon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Mobile nav drawer */}
      <Dialog
        open={mobileNavOpen && activeTab !== 'library'}
        onOpenChange={setMobileNavOpen}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>أقسام المنصة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setMobileNavOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-right transition-colors ${
                  activeTab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <TabIcon name={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Main content */}
      <main className="flex-1 w-full">
        <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-7 max-w-7xl">
          <div key={activeTab} className="animate-fade-in">
            {renderTab()}
          </div>
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-5 pb-16 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {platformMeta.title}
              </p>
              <p className="mt-0.5">
                {platformMeta.university} — {platformMeta.faculty} | قسم المحاسبة
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <button
                onClick={() => setActiveTab('about')}
                className="hover:text-primary transition-colors"
              >
                حول المنصة
              </button>
              <span aria-hidden>·</span>
              <button
                onClick={() => setActiveTab('feedback')}
                className="hover:text-primary transition-colors"
              >
                شاركنا رأيك
              </button>
              <span aria-hidden>·</span>
              <a
                href={`https://wa.me/${platformMeta.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                تواصل معنا
              </a>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-center text-muted-foreground/70">
            منصة أكاديمية ذكية © {new Date().getFullYear()} — جميع الحقوق محفوظة لأصحاب المحتوى الأصلي
          </p>
        </div>
      </footer>

      {/* Floating AI assistant */}
      <FloatingAssistant />

      {/* Floating exam countdown bar */}
      <FloatingTimeBar />
    </div>
  );
}

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState('');
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);
  const setSelectedCategory = usePlatformStore((s) => s.setSelectedCategory);
  const setSelectedSubject = usePlatformStore((s) => s.setSelectedSubject);

  const subjectResults = q.trim()
    ? allSubjects
        .filter((s) => s.title.toLowerCase().includes(q.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  const fileResults = q.trim() ? searchFiles(q).slice(0, 10) : [];

  const openSubject = (cat: string, id: string) => {
    setSelectedCategory(cat);
    setSelectedSubject(id);
    setActiveTab('subjects');
    onOpenChange(false);
    setQ('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5" /> البحث في المنصة
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن مادة أو ملف أو ملخص..."
          className="text-base"
        />
        <div className="max-h-[55vh] overflow-y-auto scroll-thin space-y-3 -mx-1 px-1">
          {q.trim() && subjectResults.length === 0 && fileResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              لا توجد نتائج مطابقة.
            </p>
          )}
          {subjectResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">
                المواد
              </p>
              <div className="space-y-1">
                {subjectResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSubject(s.category, s.id)}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium truncate">{s.title}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {s.categoryLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {fileResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">
                الملفات
              </p>
              <div className="space-y-1">
                {fileResults.map((f, i) => (
                  <a
                    key={i}
                    href={f.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{f.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {f.subjectTitle} — {f.typeLabel}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
          {!q.trim() && (
            <p className="text-sm text-muted-foreground text-center py-6">
              اكتب كلمة للبحث في {allSubjects.length} مادة وآلاف الملفات.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
