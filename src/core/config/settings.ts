/**
 * Application configuration settings
 */

export interface AppConfig {
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  output: {
    featuresDir: string;
    stepsDir: string;
    recordingsDir: string;
  };
  api: {
    defaultBaseUrl?: string;
    timeout: number;
  };
}

export function loadAppConfig(): AppConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000')
    },
    output: {
      featuresDir: process.env.FEATURES_DIR || './features',
      stepsDir: process.env.STEPS_DIR || './src/steps',
      recordingsDir: process.env.RECORDINGS_DIR || './recordings'
    },
    api: {
      defaultBaseUrl: process.env.API_BASE_URL,
      timeout: parseInt(process.env.API_TIMEOUT || '30000')
    }
  };
}

