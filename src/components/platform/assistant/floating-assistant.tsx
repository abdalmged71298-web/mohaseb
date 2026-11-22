'use client';

import { useState } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatPanel } from './chat-panel';
import { usePlatformStore } from '@/lib/store';

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const setActiveTab = usePlatformStore((s) => s.setActiveTab);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 group"
        aria-label="المساعد الذكي"
      >
        <span className="absolute inset-0 rounded-full header-gradient opacity-60 blur-lg animate-pulse" />
        <span className="relative flex items-center justify-center w-14 h-14 rounded-full header-gradient text-primary-foreground shadow-lg ring-2 ring-white/30 group-hover:scale-105 transition-transform">
          <Bot className="size-7" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background" />
        </span>
      </button>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b border-border header-gradient text-primary-foreground rounded-t-lg">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="size-5" />
                المساعد الأكاديمي الذكي
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-white/15 h-8"
                  onClick={() => {
                    setActiveTab('assistant');
                    setOpen(false);
                  }}
                >
                  <Sparkles className="size-4 ml-1" /> النسخة الكاملة
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-3">
            <ChatPanel compact />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
