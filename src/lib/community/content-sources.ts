// External content sources for the AI assistant.
//
// Fetches the official university pages, extracts visible text, caches it with
// a TTL (periodic sync), and provides keyword retrieval of relevant snippets.
// This lets the assistant cite official university info alongside the platform's
// own content — WITHOUT loading everything into the model's system prompt.
//
// Best-effort: if a page is unreachable or requires login, retrieval returns
// empty and the assistant must say it couldn't access that source.

import { platformMeta } from '@/lib/platform-data';

interface CachedPage {
  url: string;
  title: string;
  text: string;
  fetchedAt: number; // epoch ms
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — periodic sync window
const FETCH_TIMEOUT_MS = 8000;
const MAX_SNIPPETS = 4;
const SNIPPET_LEN = 350;

// The official external sources. The platform's own content comes from
// platform-data.ts (always current with the build), so it isn't fetched here.
const SOURCES: { url: string; label: string }[] = [
  {
    url: 'https://ust.edu/deanship-of-electronic-and-distance-learning/',
    label: 'عمادة التعليم الإلكتروني والتعليم عن بعد — جامعة العلوم والتكنولوجيا',
  },
  {
    url: 'https://smart.ust.edu/',
    label: 'بوابة الطالب للتعلم الإلكتروني — جامعة العلوم والتكنولوجيا',
  },
];

const cache = new Map<string, CachedPage>();
let lastSyncAt: number | null = null;

/** Strip HTML tags/scripts/styles and decode common entities → plain text. */
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rlm;|&lrm;/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract a <title> from HTML. */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** Fetch one page with timeout; returns null on any failure. */
async function fetchPage(url: string): Promise<CachedPage | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AcademicAssistant/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const text = extractText(html);
    if (!text || text.length < 50) return null;
    return { url, title: extractTitle(html) || url, text, fetchedAt: Date.now() };
  } catch {
    return null;
  }
}

/** Ensure the cache is fresh; re-fetch stale/missing pages. */
async function ensureCache(): Promise<void> {
  const now = Date.now();
  const stale = SOURCES.filter((s) => {
    const c = cache.get(s.url);
    return !c || now - c.fetchedAt > CACHE_TTL_MS;
  });
  if (stale.length === 0) return;
  // Fetch in parallel; failures just stay missing.
  const results = await Promise.all(stale.map((s) => fetchPage(s.url)));
  for (let i = 0; i < stale.length; i++) {
    if (results[i]) cache.set(stale[i].url, results[i]!);
  }
  lastSyncAt = now;
}

/** Normalize Arabic text for keyword matching. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split page text into ~SNIPPET_LEN windows for retrieval. */
function chunkText(text: string): string[] {
  const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += SNIPPET_LEN) {
    chunks.push(clean.slice(i, i + SNIPPET_LEN));
  }
  return chunks;
}

export interface ExternalSnippet {
  source: string;
  url: string;
  label: string;
  snippet: string;
}

/**
 * Retrieve relevant snippets from the official university pages for a query.
 * Returns { snippets, lastSyncAt, unavailable } — the assistant must disclose
 * when a source was unreachable.
 */
export async function retrieveExternal(message: string): Promise<{
  snippets: ExternalSnippet[];
  lastSyncAt: number | null;
  unavailable: string[];
}> {
  await ensureCache();
  const q = norm(message);
  const words = q.split(' ').filter((w) => w.length > 2);
  const snippets: ExternalSnippet[] = [];
  const unavailable: string[] = [];

  for (const src of SOURCES) {
    const page = cache.get(src.url);
    if (!page) {
      unavailable.push(src.label);
      continue;
    }
    const chunks = chunkText(page.text);
    const scored = chunks
      .map((c) => {
        const t = norm(c);
        let score = 0;
        for (const w of words) if (t.includes(w)) score += 1;
        if (t.includes(q)) score += 3;
        return { snippet: c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    for (const s of scored) {
      snippets.push({
        source: page.title,
        url: src.url,
        label: src.label,
        snippet: s.snippet.trim(),
      });
    }
  }

  // Cap total snippets
  return { snippets: snippets.slice(0, MAX_SNIPPETS), lastSyncAt, unavailable };
}

/** ISO timestamp of the last sync (for display). */
export function lastSyncISO(): string | null {
  return lastSyncAt ? new Date(lastSyncAt).toISOString() : null;
}

/** The platform's own content source URL (for citation). */
export const PLATFORM_SOURCE_URL = 'https://mohaseb-six.vercel.app/';
export const PLATFORM_SOURCE_LABEL = `بوابة دليل الطالب — ${platformMeta.title}`;
