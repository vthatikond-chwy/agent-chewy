/**
 * Shared OpenAI client for AI operations
 */
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();
export class OpenAIClient {
    client;
    constructor(apiKey) {
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY
        });
    }
    getClient() {
        return this.client;
    }
    async generateCompletion(options) {
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
//# sourceMappingURL=openai-client.js.map