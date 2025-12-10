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
export declare function loadAppConfig(): AppConfig;
//# sourceMappingURL=settings.d.ts.map