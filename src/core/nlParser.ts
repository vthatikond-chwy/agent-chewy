import OpenAI from 'openai';

export interface TestStep {
  action: 'navigate' | 'click' | 'type' | 'select' | 'wait';
  target: string;
  value?: string;
  description: string;
}

export interface Scenario {
  name: string;
  steps: TestStep[];
}

export interface TestPlan {
  featureName: string;
  description: string;
  scenarios: Scenario[];
}

export class NLParser {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async parse(instruction: string): Promise<TestPlan> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a test automation expert. Parse the instruction into a test plan. For "target" fields, provide descriptive text that clearly identifies the element (e.g., "Sign In button", "email input field", "search box"). For navigation actions, if a URL is mentioned use it, otherwise use a placeholder like "chewy.com" - credentials will be injected from environment. For login credentials, use placeholders like "user@example.com" for email/username and "password123" for password - these will be replaced with actual values from environment variables. Return ONLY valid JSON with format: {"featureName": "string", "description": "string", "scenarios": [{"name": "string", "steps": [{"action": "navigate|click|type|select|wait", "target": "string", "value": "string", "description": "string"}]}]}'
        },
        { role: 'user', content: instruction }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content!) as TestPlan;
  }
}

