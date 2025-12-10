/**
 * Team-specific configuration loader
 * Loads config from swagger/teams/{team-name}/config.json
 */
export interface TeamConfig {
    teamName: string;
    baseUrl: string;
    environment?: 'dev' | 'qat' | 'stg' | 'prd';
    useOAuth?: boolean;
    oauthTokenEnvVar?: string;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
}
/**
 * Load team configuration from config file
 */
export declare function loadTeamConfig(swaggerSpecPath: string): TeamConfig | null;
/**
 * Extract project name from swagger spec path
 * Example: swagger/teams/kyrios/kyrios-api.json -> kyrios
 */
export declare function extractProjectName(swaggerSpecPath: string): string | null;
/**
 * Get base URL from team config or fallback to swagger spec
 */
export declare function getBaseUrl(teamConfig: TeamConfig | null, swaggerSpec: any): string;
//# sourceMappingURL=team-config.d.ts.map