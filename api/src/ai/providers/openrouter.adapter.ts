import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRunOptions {
  models: string[];
  messages: ChatMessage[];
  maxOutputTokens: number;
  jsonMode?: boolean;
  cacheControlSystem?: boolean;
}

export interface OpenRouterResult {
  content: string;
  modelUsed: string;
  fallbackUsed: boolean;
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class OpenRouterAdapter {
  private readonly logger = new Logger(OpenRouterAdapter.name);
  private readonly client: OpenAI;
  private readonly isConfigured: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('OPENROUTER_API_KEY');
    this.isConfigured = !!apiKey;
    this.client = new OpenAI({
      apiKey: apiKey || 'not-configured',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': config.get<string>('OPENROUTER_SITE_URL', 'https://procreche.ch'),
        'X-Title': config.get<string>('OPENROUTER_APP_NAME', 'procreche-staffing'),
      },
    });
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  async run(options: OpenRouterRunOptions): Promise<OpenRouterResult> {
    const { models, messages, maxOutputTokens, jsonMode } = options;

    const body: any = {
      model: models[0],
      messages,
      max_tokens: maxOutputTokens,
      stream: false,
    };

    if (models.length > 1) {
      body.models = models;
    }

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(body) as OpenAI.ChatCompletion;

    const choice = response.choices[0];
    const modelUsed = (response as any).model || models[0];
    const fallbackUsed = modelUsed !== models[0];
    const usage = response.usage;

    return {
      content: choice.message.content || '',
      modelUsed,
      fallbackUsed,
      inputTokens: usage?.prompt_tokens || 0,
      outputTokens: usage?.completion_tokens || 0,
    };
  }
}
