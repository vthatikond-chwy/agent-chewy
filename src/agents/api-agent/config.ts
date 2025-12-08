/**
 * Configuration for API test generator
 */

export interface ApiGeneratorConfig {
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  generation: {
    generatePositive: boolean;
    generateNegative: boolean;
    generateBoundary: boolean;
    generateSecurity: boolean;
  };
  output: {
    featuresDir: string;
    stepsDir: string;
  };
}

export const defaultConfig: ApiGeneratorConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 4000
  },
  generation: {
    generatePositive: true,
    generateNegative: true,
    generateBoundary: true,
    generateSecurity: true
  },
  output: {
    featuresDir: './features/api',
    stepsDir: './src/steps/api'
  }
};

export function loadConfig(): ApiGeneratorConfig {
  // Load from environment or config file
  return {
    ...defaultConfig,
    openai: {
      ...defaultConfig.openai,
      apiKey: process.env.OPENAI_API_KEY || defaultConfig.openai.apiKey,
      model: process.env.OPENAI_MODEL || defaultConfig.openai.model
    }
  };
}

