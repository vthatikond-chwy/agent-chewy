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
    auth: {
        oauthToken?: string;
        useProjectNameMatching: boolean;
    };
}
export declare const defaultConfig: ApiGeneratorConfig;
export declare function loadConfig(): ApiGeneratorConfig;
//# sourceMappingURL=config.d.ts.map