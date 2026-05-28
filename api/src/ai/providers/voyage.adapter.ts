import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  totalTokens: number;
}

/**
 * Parses a Retry-After header value which may be either delta-seconds ("30")
 * or an HTTP-date ("Wed, 28 May 2026 09:00:00 GMT"). Returns the wait in ms,
 * falling back to `defaultMs` if the value is absent or unparseable.
 */
function parseRetryAfter(header: string | null, defaultMs: number): number {
  if (!header) return defaultMs;
  // Delta-seconds: a string containing only digits (possibly with leading spaces)
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds >= 0) return seconds * 1000;
  // HTTP-date
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const wait = date.getTime() - Date.now();
    return wait > 0 ? wait : defaultMs;
  }
  return defaultMs;
}

@Injectable()
export class VoyageAdapter {
  private readonly logger = new Logger(VoyageAdapter.name);
  private readonly apiKey: string | undefined;
  private readonly isConfigured: boolean;
  private readonly defaultModel = 'voyage-3-lite';
  private readonly baseUrl = 'https://api.voyageai.com/v1';

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('VOYAGE_API_KEY');
    this.isConfigured = !!this.apiKey;
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  async embed(text: string, model?: string): Promise<EmbeddingResult> {
    const useModel = model || this.defaultModel;

    if (!this.isConfigured) {
      this.logger.warn('Voyage AI not configured — returning zero embedding');
      return { embedding: new Array(512).fill(0), model: useModel, totalTokens: 0 };
    }

    const maxAttempts = 4;
    let delayMs = 2_000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input: [text], model: useModel }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        return {
          embedding: data.data[0].embedding,
          model: useModel,
          totalTokens: data.usage?.total_tokens || 0,
        };
      }

      if (response.status === 429 && attempt < maxAttempts) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = parseRetryAfter(retryAfter, delayMs);
        this.logger.warn(`Voyage AI rate-limited — retrying in ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        delayMs *= 2;
        continue;
      }

      throw new Error(`Voyage AI error: ${response.status} ${response.statusText}`);
    }

    throw new Error('Voyage AI error: max retries exceeded');
  }
}
