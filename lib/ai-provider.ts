// Provider-agnostic AI chat client.
//
// This module abstracts the LLM call so the assistant route (and the rest of
// the app) never depends on a single vendor. When the project is moved to
// another host, you only set environment variables — no UI or route code
// needs to change.
//
// Priority of providers:
//   1. Standard OpenAI-compatible REST API via env vars:
//        AI_API_BASE_URL, AI_API_KEY, AI_MODEL
//      Works with: OpenAI, Groq, OpenRouter, Together, DeepSeek, Google Gemini
//      (OpenAI-compatible mode), Ollama (local), and any OpenAI-compatible endpoint.
//   2. z-ai-web-dev-sdk (bundled in this dev environment) as a fallback when no
//      env config is present. This keeps the assistant working in the current
//      sandbox without any setup.
//
// No API keys are ever exposed to the client — this module runs server-side only.

import ZAI from 'z-ai-web-dev-sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  provider: string;
}

const TIMEOUT_MS = 45000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Resolve the active provider configuration from environment variables.
 * Returns null when no env config is set (caller falls back to bundled SDK).
 */
function getEnvProvider(): { baseUrl: string; apiKey: string; model: string } | null {
  const baseUrl = process.env.AI_API_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (baseUrl && apiKey && model) {
    return { baseUrl, apiKey, model };
  }
  return null;
}

/**
 * Call an OpenAI-compatible /chat/completions endpoint directly via fetch.
 * This is the portable path used when env vars are configured.
 */
async function callOpenAICompatible(
  cfg: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[]
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      // Standard OpenAI-compatible flag; harmless if the provider ignores it.
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string | undefined =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    (typeof data?.output === 'string' ? data.output : undefined);
  if (!content) throw new Error('empty response from provider');
  return content.trim();
}

/**
 * Fallback: use the bundled z-ai-web-dev-sdk (works in this dev environment
 * without any env config). Returns a chat completion.
 */
async function callBundledSDK(messages: ChatMessage[]): Promise<string> {
  const zai = await ZAI.create();
  // The bundled SDK expects the system prompt as the first "assistant" message.
  const mapped = messages.map((m) => ({
    role: m.role === 'system' ? ('assistant' as const) : m.role,
    content: m.content,
  }));
  const completion = await zai.chat.completions.create({
    messages: mapped,
    thinking: { type: 'disabled' },
  });
  const content = completion?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('empty response from bundled SDK');
  return content;
}

/**
 * Public entry point: send messages to whichever provider is configured and
 * return the assistant's reply. Retries up to `maxAttempts` times on failure.
 */
export async function chatComplete(
  messages: ChatMessage[],
  maxAttempts = 3
): Promise<ChatResult> {
  const envProvider = getEnvProvider();
  const providerName = envProvider ? `openai-compatible (${envProvider.model})` : 'bundled-sdk';

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = envProvider
        ? await withTimeout(callOpenAICompatible(envProvider, messages), TIMEOUT_MS)
        : await withTimeout(callBundledSDK(messages), TIMEOUT_MS);
      return { content, provider: providerName };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('all attempts failed');
}

/**
 * Whether an external (portable) provider is configured via env vars.
 * Useful for surfacing a status note without exposing any secrets.
 */
export function isExternalProviderConfigured(): boolean {
  return getEnvProvider() !== null;
}
