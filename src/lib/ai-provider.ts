// Server-only OpenAI-compatible chat client. Provider credentials never enter client bundles.
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  provider: string;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const TIMEOUT_MS = 25000;

function getEnvProvider(): { baseUrl: string; apiKey: string; model: string } {
  const baseUrl = process.env.AI_API_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const missing = [
    !baseUrl && 'AI_API_BASE_URL',
    !apiKey && 'AI_API_KEY',
    !model && 'AI_MODEL',
  ].filter(Boolean);
  if (missing.length) {
    throw new AIProviderError(`Missing server configuration: ${missing.join(', ')}`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl!);
  } catch {
    throw new AIProviderError('AI_API_BASE_URL is not a valid URL');
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new AIProviderError('AI_API_BASE_URL must use HTTPS');
  }
  return { baseUrl: baseUrl!.replace(/\/+$/, ''), apiKey: apiKey!, model: model! };
}

function providerError(status: number): AIProviderError {
  const retryable = status === 429 || status >= 500;
  const reason = status === 400 ? 'invalid request or model configuration'
    : status === 401 ? 'provider rejected the API credentials'
      : status === 403 ? 'provider denied access to this model or account'
        : status === 404 ? 'chat completion endpoint or model was not found'
          : status === 429 ? 'provider rate limit or quota was reached'
            : status >= 500 ? 'provider service error'
              : 'provider rejected the request';
  return new AIProviderError(`AI provider returned HTTP ${status}: ${reason}`, status, retryable);
}

async function callOpenAICompatible(
  cfg: { baseUrl: string; apiKey: string; model: string },
  messages: ChatMessage[],
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages, stream: false }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw providerError(res.status);

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new AIProviderError('AI provider returned invalid JSON');
    }
    const content = (data as { choices?: { message?: { content?: unknown } }[] })
      ?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIProviderError('AI provider returned an empty or unsupported response');
    }
    return content.trim();
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (controller.signal.aborted) throw new AIProviderError('AI provider request timed out', 504, true);
    // Avoid including fetch exception details, which can contain sensitive URL data.
    throw new AIProviderError('Could not connect to AI provider', undefined, true);
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatComplete(messages: ChatMessage[], maxAttempts = 2): Promise<ChatResult> {
  const cfg = getEnvProvider();
  let lastError: AIProviderError | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = await callOpenAICompatible(cfg, messages);
      return { content, provider: `openai-compatible (${cfg.model})` };
    } catch (error) {
      lastError = error instanceof AIProviderError
        ? error
        : new AIProviderError('Unexpected AI provider error');
      if (!lastError.retryable || attempt === maxAttempts) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError ?? new AIProviderError('AI request failed');
}

export function isExternalProviderConfigured(): boolean {
  return Boolean(
    process.env.AI_API_BASE_URL?.trim() &&
    process.env.AI_API_KEY?.trim() &&
    process.env.AI_MODEL?.trim(),
  );
}
