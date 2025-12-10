/**
 * Shared OpenAI client for AI operations
 */
import OpenAI from 'openai';
export declare class OpenAIClient {
    private client;
    constructor(apiKey?: string);
    getClient(): OpenAI;
    generateCompletion(options: {
        model?: string;
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
        temperature?: number;
        maxTokens?: number;
        responseFormat?: {
            type: 'json_object' | 'text';
        };
    }): Promise<string>;
}
//# sourceMappingURL=openai-client.d.ts.map