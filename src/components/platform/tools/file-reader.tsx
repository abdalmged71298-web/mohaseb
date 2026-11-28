'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { usePlatformStore } from '@/lib/store';
import { toast } from 'sonner';

export function FileReaderTool() {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState('');
  const addRecent = usePlatformStore((s) => s.addRecent);
  const recents = usePlatformStore((s) => s.recents);

  const open = () => {
    const u = url.trim();
    if (!u) { toast.error('أدخل رابط ملف'); return; }
    // Google Drive view links need conversion for embedding
    let embed = u;
    const driveMatch = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      embed = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    setLoaded(embed);
    addRecent({ url: u, label: 'قارئ الملفات', subjectTitle: 'معاينة', type: 'books' });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="size-5 text-teal-600" />
          <h3 className="font-bold">قارئ الملفات</h3>
        </div>

        <Label className="text-xs mb-1.5 block">رابط الملف (PDF / Google Drive)</Label>
        <div className="flex gap-2 mb-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." dir="ltr" />
          <Button onClick={open}>معاينة</Button>
          <Button variant="outline" size="icon" onClick={copyUrl} aria-label="نسخ">
            <LinkIcon className="size-4" />
          </Button>
        </div>

        {loaded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">معاينة</Badge>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  فتح في نافذة <ExternalLink className="size-3.5 mr-1" />
                </Button>
              </a>
            </div>
            <div className="w-full h-[70vh] rounded-lg border border-border overflow-hidden bg-muted">
              <iframe
                src={loaded}
                className="w-full h-full"
                title="معاينة الملف"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        )}

        {!loaded && (
          <div className="p-6 rounded-lg bg-muted/40 text-center">
            <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              أدخل رابط ملف PDF أو رابط Google Drive لمعاينته هنا.
              للملفات التي لا تدعم المعاينة المباشرة، استخدم زر «فتح في نافذة».
            </p>
          </div>
        )}
      </Card>

      {recents.length > 0 && (
        <Card className="p-4">
          <p className="font-semibold text-sm mb-2">ملفات مفتوحة مؤخراً</p>
          <div className="space-y-1 max-h-40 overflow-y-auto scroll-thin">
            {recents.slice(0, 8).map((r, i) => (
              <button
                key={i}
                onClick={() => setUrl(r.url)}
                className="w-full text-right px-2 py-1.5 rounded hover:bg-muted text-sm truncate block"
              >
                {r.label}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
