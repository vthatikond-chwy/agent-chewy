/**
 * Shared OpenAI client for AI operations
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  getClient(): OpenAI {
    return this.client;
  }

  async generateCompletion(options: {
    model?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' | 'text' };
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      response_format: options.responseFormat
    });

    return response.choices[0].message.content || '';
  }
}

