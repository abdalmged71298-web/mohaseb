'use client';

import { Clock, MessageCircle, Mail, Users, Megaphone, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  platformData,
  announcementsText,
  examInfo,
  contacts,
  platformMeta,
} from '@/lib/platform-data';
import { FileLink } from '../file-link';

function useCountdown(target: string) {
  // server-safe placeholder not needed here; this is client
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor((ms % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
  return { months, days };
}

export function AnnouncementsTab() {
  const { months, days } = useCountdown(examInfo.date);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">الإعلانات والتنبيهات</h2>
        <p className="text-sm text-muted-foreground">آخر تحديثات الجامعة والجدول الدراسي</p>
      </div>

      {/* Exam countdown */}
      <Card className="p-5 border-accent/40 bg-accent/5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
            <Clock className="size-7 text-accent-foreground" />
          </div>
          <div className="flex-1 text-center sm:text-right">
            <p className="font-bold">{examInfo.label}</p>
            <p className="text-sm text-muted-foreground">
              الوقت المتبقي: {months} شهر و {days} يوم
            </p>
          </div>
          <a href={examInfo.countdownLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              العد التنازلي الكامل <ExternalLink className="size-3.5 mr-1" />
            </Button>
          </a>
        </div>
      </Card>

      {/* Text announcements */}
      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Megaphone className="size-5 text-primary" /> تنبيهات
        </h3>
        <ul className="space-y-2">
          {announcementsText.map((t, i) => (
            <li key={i} className="text-sm leading-relaxed flex gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Official announcement files */}
      <Card className="p-5">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <span>📄</span> ملفات الإعلانات الرسمية
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          جداول ومستندات رسمية من الجامعة — اضغط لفتح الملف.
        </p>
        <div className="grid gap-2">
          {platformData.AdvertisementAnnouncements.map((a, i) => (
            <FileLink
              key={i}
              label={a.label}
              url={a.url}
              type="books"
              subjectTitle="إعلانات الجامعة"
            />
          ))}
        </div>
      </Card>

      {/* Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="size-5 text-emerald-600" /> أرقام واتساب
          </h3>
          <div className="space-y-2">
            {contacts.whatsappNumbers.map((c, i) => (
              <a
                key={i}
                href={`https://wa.me/${c.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                  +{c.number}
                </p>
              </a>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Users className="size-5 text-sky-600" /> قروبات
          </h3>
          <div className="space-y-2">
            {contacts.whatsappGroups.map((c, i) => (
              <a
                key={i}
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">
                  {c.link}
                </p>
              </a>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Mail className="size-5 text-amber-600" /> البريد الإلكتروني
          </h3>
          <div className="space-y-2">
            {contacts.emails.map((c, i) => (
              <a
                key={i}
                href={`mailto:${c.email}`}
                className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">
                  {c.email}
                </p>
              </a>
            ))}
          </div>
        </Card>
      </div>

      {/* Admin contact CTA */}
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="flex-1">
            <p className="font-bold">{platformMeta.adminName}</p>
            <p className="text-sm text-muted-foreground">{platformMeta.adminRole}</p>
            <p className="text-xs text-muted-foreground mt-1">
              لأي ملاحظات أو إضافات أو طلب تعديل على مادة أو ملف.
            </p>
          </div>
          <a href={platformMeta.whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="size-4 ml-2" /> تواصل عبر واتساب
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
