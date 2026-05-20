import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  totalTokens: number;
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

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: [text], model: useModel }),
    });

    if (!response.ok) {
      throw new Error(`Voyage AI error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return {
      embedding: data.data[0].embedding,
      model: useModel,
      totalTokens: data.usage?.total_tokens || 0,
    };
  }
}
