/**
 * Configuration for API test generator
 */
export const defaultConfig = {
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
    },
    auth: {
        oauthToken: process.env.OAUTH_TOKEN,
        useProjectNameMatching: process.env.USE_PROJECT_NAME_MATCHING === 'true'
    }
};
export function loadConfig() {
    // Load from environment or config file
    return {
        ...defaultConfig,
        openai: {
            ...defaultConfig.openai,
            apiKey: process.env.OPENAI_API_KEY || defaultConfig.openai.apiKey,
            model: process.env.OPENAI_MODEL || defaultConfig.openai.model
        },
        auth: {
            oauthToken: process.env.OAUTH_TOKEN || defaultConfig.auth.oauthToken,
            useProjectNameMatching: process.env.USE_PROJECT_NAME_MATCHING === 'true' || defaultConfig.auth.useProjectNameMatching
        }
    };
}
//# sourceMappingURL=config.js.map