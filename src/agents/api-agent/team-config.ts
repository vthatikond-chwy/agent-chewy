/**
 * Team-specific configuration loader
 * Loads config from swagger/teams/{team-name}/config.json
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TeamConfig {
  teamName: string;
  baseUrl: string;
  environment?: 'dev' | 'qat' | 'stg' | 'prd';
  useOAuth?: boolean;
  oauthTokenEnvVar?: string; // Environment variable name for OAuth token (default: OAUTH_TOKEN)
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

/**
 * Load team configuration from config file
 */
export function loadTeamConfig(swaggerSpecPath: string): TeamConfig | null {
  try {
    const projectName = extractProjectName(swaggerSpecPath);
    if (!projectName) {
      return null;
    }

    // Look for config file in swagger/teams/{project-name}/config.json
    const specDir = path.dirname(swaggerSpecPath);
    const configPath = path.join(specDir, 'config.json');

    if (!fs.existsSync(configPath)) {
      return null;
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: TeamConfig = JSON.parse(configContent);
    
    // Set team name from project name
    config.teamName = projectName;

    // Resolve baseUrl with environment variable if needed
    if (config.baseUrl && config.environment) {
      config.baseUrl = config.baseUrl.replace('{environment}', config.environment);
    }

    return config;
  } catch (error) {
    console.warn(`Warning: Could not load team config: ${error}`);
    return null;
  }
}

/**
 * Extract project name from swagger spec path
 * Example: swagger/teams/kyrios/kyrios-api.json -> kyrios
 */
export function extractProjectName(swaggerSpecPath: string): string | null {
  try {
    const normalizedPath = path.normalize(swaggerSpecPath);
    const parts = normalizedPath.split(path.sep);
    
    // Look for 'teams' directory and get the next directory as project name
    const teamsIndex = parts.findIndex(part => part === 'teams');
    if (teamsIndex !== -1 && teamsIndex + 1 < parts.length) {
      const projectName = parts[teamsIndex + 1];
      return projectName || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get base URL from team config or fallback to swagger spec
 */
export function getBaseUrl(teamConfig: TeamConfig | null, swaggerSpec: any): string {
  if (teamConfig?.baseUrl) {
    return teamConfig.baseUrl;
  }

  // Fallback to swagger spec
  if (swaggerSpec.servers && swaggerSpec.servers.length > 0) {
    let url = swaggerSpec.servers[0].url;
    // Replace environment variables if present
    if (teamConfig?.environment) {
      url = url.replace('{environment}', teamConfig.environment);
    }
    return url;
  }

  // Swagger 2.0 fallback
  const schemes = swaggerSpec.schemes || ['https'];
  const host = swaggerSpec.host || 'api.example.com';
  const basePath = swaggerSpec.basePath || '';
  
  return `${schemes[0]}://${host}${basePath}`;
}

