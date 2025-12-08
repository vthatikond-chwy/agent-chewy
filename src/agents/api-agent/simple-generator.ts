/**
 * Simple API test generator using OpenAI
 */

import OpenAI from 'openai';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadConfig } from './config.js';
import { loadTeamConfig, getBaseUrl as getTeamBaseUrl } from './team-config.js';
import type { TeamConfig } from './team-config.js';
import { analyzeSchema, getMinimalRequestBody, getResponseTypeDescription } from './schema-analyzer.js';
import { findPatternForEndpoint, getMinimalRequestBodyFromPattern, getResponseTypeFromPattern } from './self-healing.js';

dotenv.config();

export interface TestScenario {
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'boundary' | 'security';
  priority: 'high' | 'medium' | 'low';
  endpoint: string;
  method: string;
  testData?: any;
  expectedStatus: number;
  assertions: string[];
  prerequisites?: string[];
  tags?: string[];
}

export class SimpleTestGenerator {
  private openai: OpenAI;
  private config = loadConfig();

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Extract project name from swagger spec path
   * Example: swagger/teams/kyrios/kyrios-api.json -> kyrios
   */
  private extractProjectName(swaggerSpecPath: string): string | null {
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
   * Check if OAuth token should be used for this project
   */
  private shouldUseOAuthToken(swaggerSpecPath: string, teamConfig: TeamConfig | null): boolean {
    // First check team config
    if (teamConfig?.useOAuth) {
      const tokenEnvVar = teamConfig.oauthTokenEnvVar || 'OAUTH_TOKEN';
      return !!process.env[tokenEnvVar];
    }

    // Fallback to global config
    if (!this.config.auth.useProjectNameMatching) {
      return false;
    }

    if (!this.config.auth.oauthToken) {
      return false;
    }

    const projectName = this.extractProjectName(swaggerSpecPath);
    return projectName !== null && projectName !== undefined;
  }

  /**
   * Get OAuth token from team config or global config
   */
  private getOAuthToken(teamConfig: TeamConfig | null): string | undefined {
    if (teamConfig?.useOAuth) {
      const tokenEnvVar = teamConfig.oauthTokenEnvVar || 'OAUTH_TOKEN';
      return process.env[tokenEnvVar];
    }
    return this.config.auth.oauthToken;
  }

  /**
   * Generate test scenarios from natural language
   */
  async generateTestScenarios(
    naturalLanguageInput: string,
    swaggerSpec: any,
    targetEndpoints?: string[]
  ): Promise<TestScenario[]> {
    
    // Filter endpoints if specified
    let endpoints = [];
    const paths = swaggerSpec.paths || {};
    
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!targetEndpoints || targetEndpoints.includes(path)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: operation.summary,
              description: operation.description,
              parameters: operation.parameters || [],
              requestBody: operation.requestBody,
              responses: operation.responses
            });
          }
        }
      }
    }

    const systemPrompt = `You are an expert API test architect. Generate comprehensive test scenarios from natural language requirements and API specifications.

Return ONLY valid JSON with no additional text, in this exact format:
{
  "scenarios": [
    {
      "name": "Test scenario name",
      "description": "Detailed description",
      "type": "positive|negative|boundary|security",
      "priority": "high|medium|low",
      "endpoint": "/api/path",
      "method": "POST",
      "testData": {},
      "expectedStatus": 200,
      "assertions": ["assertion 1", "assertion 2"],
      "prerequisites": [],
      "tags": ["@api", "@tag"]
    }
  ]
}`;

    const userPrompt = `Natural Language Requirement:
${naturalLanguageInput}

API Specification:
${JSON.stringify({
  apiTitle: swaggerSpec.info.title,
  baseUrl: this.getBaseUrl(swaggerSpec),
  endpoints: endpoints
}, null, 2)}

Generate comprehensive test scenarios covering positive, negative, boundary, and security test cases.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(content);
      return result.scenarios || [];
      
    } catch (error: any) {
      throw new Error(`Failed to generate test scenarios: ${error.message}`);
    }
  }

  /**
   * Generate Cucumber feature file from scenario
   */
  async generateCucumberFeature(
    scenario: TestScenario,
    swaggerSpec: any
  ): Promise<string> {
    
    const systemPrompt = `You are an expert in writing Cucumber/Gherkin test scenarios for API testing.
Generate clear, executable BDD scenarios following best practices.
Return ONLY the Cucumber feature text, no markdown code blocks or explanations.`;

    const scenarioName = scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const userPrompt = `Generate a Cucumber/Gherkin feature file for this API test scenario:

Scenario Details:
${JSON.stringify(scenario, null, 2)}

API Context:
- Base URL: ${this.getBaseUrl(swaggerSpec)}
- Endpoint: ${scenario.method} ${scenario.endpoint}
- Scenario Name: ${scenario.name}
- Scenario ID: ${scenarioName}

Format:
Feature: [Feature name]

  @tag1 @tag2
  Scenario: ${scenario.name}
    Given [setup steps]
    When [action steps]  
    Then [assertion steps]

CRITICAL REQUIREMENTS:
1. Use data tables for request bodies with multiple fields (like address fields)
2. Make step text UNIQUE and SPECIFIC - include scenario context to avoid conflicts
   - Example: "Given the API endpoint for ${scenarioName} test is {string}" instead of "Given the API endpoint is {string}"
   - Example: "When I send a POST request for ${scenarioName}" instead of "When I send a POST request"
   - Use "${scenarioName}" in step text to make it unique
3. For AVS API, use endpoint "/avs/v1.0/verifyAddress" (NOT the full URL, just the path)
   - CORRECT: Given the API endpoint for ${scenarioName} test is "/avs/v1.0/verifyAddress"
   - WRONG: Given the API endpoint for ${scenarioName} test is "https://avs.scff.stg.chewy.com/avs/v1.0/verifyAddress"
4. Use clear, business-readable language
5. Include appropriate tags (@api, @positive, @negative, @boundary, @security)
6. For address data, streets should be an array format in the request body

Example data table format for address:
    | streets       | city    | stateOrProvince | postalCode | country |
    | 600 HARLAN CT | Bonaire | GA              | 31005-5427 | US      |

CRITICAL: Always use just the endpoint path (e.g., "/avs/v1.0/verifyAddress"), never the full URL in feature files.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      });

      let content = response.choices[0].message.content || '';
      
      // Remove markdown code blocks if present
      content = content.replace(/^```gherkin\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();
      
      // Ensure feature files use path only, not full URL
      content = content.replace(/https:\/\/avs\.scff\.stg\.chewy\.com\/avs\/v1\.0\/verifyAddress/g, '/avs/v1.0/verifyAddress');
      
      return content;
      
    } catch (error: any) {
      throw new Error(`Failed to generate Cucumber feature: ${error.message}`);
    }
  }

  /**
   * Generate TypeScript step definitions
   */
  async generateStepDefinitions(
    cucumberFeature: string,
    scenario: TestScenario,
    swaggerSpec: any,
    swaggerSpecPath?: string
  ): Promise<string> {
    
    const systemPrompt = `You are an expert in API test automation with TypeScript and Cucumber.
Generate production-ready step definitions with proper error handling and assertions.
Return ONLY the TypeScript code, properly formatted. Do NOT include markdown code blocks.`;

    const scenarioName = scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Load team config if swagger spec path is provided
    const teamConfig = swaggerSpecPath ? loadTeamConfig(swaggerSpecPath) : null;
    
    // Get base URL from team config or swagger spec
    const baseUrl = getTeamBaseUrl(teamConfig, swaggerSpec);
    
    // Check if OAuth token should be used
    const useOAuth = swaggerSpecPath ? this.shouldUseOAuthToken(swaggerSpecPath, teamConfig) : false;
    const oauthToken = useOAuth ? this.getOAuthToken(teamConfig) : undefined;
    const oauthTokenEnvVar = teamConfig?.oauthTokenEnvVar || 'OAUTH_TOKEN';
    
    // Build default headers from team config
    const defaultHeaders = teamConfig?.defaultHeaders || { 'Content-Type': 'application/json' };
    const headersCode = Object.entries(defaultHeaders)
      .map(([key, value]) => `    '${key}': '${value}',`)
      .join('\n');
    
    // Analyze request body schema - try self-healing patterns first, then schema analysis
    let requestBodyInfo = '';
    let responseTypeInfo = '';
    const endpointPath = scenario.endpoint;
    const method = scenario.method.toLowerCase();
    
    // Check for learned patterns first (self-healing)
    const learnedPattern = findPatternForEndpoint(endpointPath, method);
    if (learnedPattern) {
      const minimalBody = getMinimalRequestBodyFromPattern(endpointPath, method);
      const responseType = getResponseTypeFromPattern(endpointPath, method);
      
      requestBodyInfo = `
IMPORTANT - Request Body Structure (from successful test patterns):
- Use this SIMPLE structure that we know works: ${JSON.stringify(minimalBody, null, 2)}
- DO NOT add complex nested objects (addresses, contacts, etc.)
- Only include these top-level fields: ${Object.keys(minimalBody || {}).join(', ')}
`;
      
      if (responseType === 'integer') {
        responseTypeInfo = 'The API returns just the user ID as an integer (number), not an object with properties.';
      } else if (responseType === 'object') {
        responseTypeInfo = 'The API returns an object with properties.';
      }
    } else {
      // Fall back to schema analysis
      try {
        const endpoint = swaggerSpec.paths?.[endpointPath]?.[method];
        
        if (endpoint?.requestBody) {
          const requestSchema = endpoint.requestBody?.content?.['application/json']?.schema;
          if (requestSchema) {
            const analyzed = analyzeSchema(requestSchema, swaggerSpec);
            const minimalBody = getMinimalRequestBody(requestSchema, swaggerSpec);
            requestBodyInfo = `
IMPORTANT - Request Body Structure (from Swagger schema):
- The API accepts a SIMPLE, FLAT structure with these fields: ${analyzed.requiredFields.join(', ')}
- DO NOT include complex nested objects (addresses, contacts, etc.) unless explicitly required
- Use only top-level fields: ${Object.keys(minimalBody).join(', ')}
- Example minimal request: ${JSON.stringify(minimalBody, null, 2)}
`;
          }
        }
        
        if (endpoint?.responses?.[scenario.expectedStatus.toString()]) {
          const responseSchema = endpoint.responses[scenario.expectedStatus.toString()]?.content?.['*/*']?.schema ||
                                endpoint.responses[scenario.expectedStatus.toString()]?.content?.['application/json']?.schema;
          if (responseSchema) {
            responseTypeInfo = getResponseTypeDescription(responseSchema, swaggerSpec);
          }
        }
      } catch (error) {
        // Schema analysis failed, continue without it
        console.warn('Schema analysis failed:', error);
      }
    }
    
    const userPrompt = `Generate TypeScript step definitions for this Cucumber feature:

Feature File:
${cucumberFeature}

API Details:
- Base URL: ${baseUrl}
- Endpoint: ${scenario.method} ${scenario.endpoint}
- Expected Status: ${scenario.expectedStatus}
- Scenario Name: ${scenario.name}
- Scenario ID: ${scenarioName}
${useOAuth ? `- Authentication: OAuth Bearer token required (use process.env.${oauthTokenEnvVar})` : ''}
${requestBodyInfo}
${responseTypeInfo ? `\nIMPORTANT - Response Structure:\n${responseTypeInfo}\n` : ''}

CRITICAL REQUIREMENTS:
1. Use @cucumber/cucumber (Given, When, Then, World)
2. Use axios for HTTP requests with CORRECT import syntax:
   - import axios from 'axios';
   - import type { AxiosResponse } from 'axios';
   - DO NOT use: import axios, { AxiosResponse } from 'axios';
3. Use chai for assertions: import { expect } from 'chai';
4. Define CustomWorld interface extending World - DO NOT import from external files
5. Store request/response in World context (this.response, this.requestBody, etc.)
6. Always set baseUrl to '${baseUrl}' in the step definition that sets the endpoint
5. For data tables with MULTIPLE COLUMNS (like address fields), use dataTable.hashes() NOT rowsHash()
   - rowsHash() only works for 2-column tables (key-value pairs)
   - hashes() returns an array of objects for multi-column tables
   - Example: const rows = dataTable.hashes(); const addressData = rows[0];
6. For AVS API addresses, convert streets to array format: streets: [addressData.streets]
7. Make step definitions UNIQUE and SPECIFIC - include scenario name/context in step text to avoid conflicts
   - Example: "Given the API endpoint for ${scenarioName} test is {string}" 
   - Example: "When I send a POST request for ${scenarioName}"
   - Use "${scenarioName}" (sanitized scenario name) in ALL step definitions to make them unique
8. In step definitions, always handle errors properly - set this.response = error.response when axios errors occur
   - Example: catch (error) { if (axios.isAxiosError(error)) { this.response = error.response; } }
8. Use baseUrl: ${baseUrl}
9. Handle errors properly with try/catch
10. Add TypeScript types for World interface
11. Include proper headers from team config${useOAuth ? ' and Authorization: Bearer token' : ''}
12. For AVS API responses, use 'responseCode' field (not 'verificationStatus')
13. DO NOT generate common steps like "the response status code should be {int}" - these are in common.steps.ts
${useOAuth ? `14. IMPORTANT: Include Authorization header with Bearer token in all requests. Use process.env.${oauthTokenEnvVar} to get the token.` : ''}
17. CRITICAL - Request Body Parsing: For data tables with multiple columns, ALWAYS use dataTable.hashes() and extract the first row: const rows = dataTable.hashes(); const data = rows[0];
18. CRITICAL - Request Body Structure: Build a simple object with only the fields from the data table. DO NOT use rowsHash() for multi-column tables.
19. CRITICAL - Response Assertions: Match the actual response type. If the API returns an integer (user ID), assert it's a number, not an object with properties.

Example for multi-column data table (ALWAYS use hashes() for tables with more than 2 columns):
Given('the request body for [scenario-name] is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes(); // ALWAYS use hashes() for multi-column tables
  const data = rows[0]; // Extract first row
  this.requestBody = {
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullName,
    registerType: data.registerType
  };
  // Handle optional fields like id (convert to number if present)
  if (data.id) {
    this.requestBody.id = parseInt(data.id);
  }
});

Example for error handling in When steps (CRITICAL - must handle errors correctly):
When('I send a POST request for [scenario-name]', async function (this: CustomWorld) {
  try {
    const response = await axios.post(\`\${this.baseUrl}\${this.endpoint}\`, this.requestBody, { headers: this.headers });
    this.response = response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      this.response = error.response;
    } else if (axios.isAxiosError(error)) {
      this.response = error.response;
    } else {
      throw error;
    }
  }
});

${useOAuth ? `Example for setting up headers with OAuth token and default headers (REQUIRED when authentication is needed):
Given('the API endpoint for [scenario-name] test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = '${baseUrl}';
  this.endpoint = endpoint;
  this.headers = {
${headersCode}
    'Authorization': \`Bearer \${process.env.${oauthTokenEnvVar}}\`
  };
});

IMPORTANT: Always include the Authorization header with Bearer token when setting up headers in the endpoint step definition. Use process.env.${oauthTokenEnvVar} to get the token. Include all default headers from team config.` : `Example for setting up headers with default headers:
Given('the API endpoint for [scenario-name] test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = '${baseUrl}';
  this.endpoint = endpoint;
  this.headers = {
${headersCode}
  };
});`}

IMPORTANT: Always handle errors properly - set this.response = error.response when axios errors occur, so assertions can check response.status even for error responses.

REQUIRED World interface (include this in every file):
import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse;
}

DO NOT import CustomWorld from external files - define it in each step definition file.

Example for response status code validation (ALWAYS include this for every scenario):
Then('the response status code should be {int} for [scenario-name] test', function (this: CustomWorld, expectedStatusCode: number) {
  expect(this.response?.status).to.equal(expectedStatusCode);
});

Example for integer response (when API returns just a number like user ID):
Then('the response should contain a valid id for [scenario-name]', function (this: CustomWorld) {
  // Response is just the user ID (integer), not an object
  expect(this.response?.data).to.be.a('number');
  expect(this.response?.data).to.not.be.null;
  expect(this.response?.data).to.be.greaterThan(0);
});

Example for object response (when API returns an object with properties):
Then('the response body for [scenario-name] should contain property {string}', function (this: CustomWorld, propertyName: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property(propertyName);
});

Example for response validation (AVS API):
Then('the response should contain the responseCode {string} for [scenario-name]', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

CRITICAL: Make ALL step definitions unique by including scenario context in the step text to avoid conflicts with other test files.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      });

      let content = response.choices[0].message.content || '';
      
      // Remove markdown code blocks if present
      content = content.replace(/^```typescript\n?/g, '').replace(/^```ts\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();
      
      // COMPREHENSIVE FIX: Apply all fixes in correct order
      content = this.applyAllFixes(content, cucumberFeature, defaultHeaders, useOAuth, oauthTokenEnvVar, baseUrl);
      
      // Ensure dotenv is imported and configured
      if (!content.includes("import * as dotenv from 'dotenv'")) {
        // Find the last import statement and add dotenv after it
        const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*\n)/g;
        const imports = content.match(importRegex) || [];
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          if (lastImport) {
            const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
            content = content.slice(0, lastImportIndex) + 
                     "import * as dotenv from 'dotenv';\n\n" +
                     "dotenv.config();\n\n" +
                     content.slice(lastImportIndex);
          }
        } else {
          // No imports found, add at the beginning
          content = "import * as dotenv from 'dotenv';\n\ndotenv.config();\n\n" + content;
        }
      }
      
      // Ensure dotenv.config() is called if dotenv is imported
      if (content.includes("import * as dotenv") && !content.includes("dotenv.config()")) {
        const dotenvImportIndex = content.indexOf("import * as dotenv");
        if (dotenvImportIndex >= 0) {
          const nextLineIndex = content.indexOf('\n', dotenvImportIndex) + 1;
          if (nextLineIndex > 0) {
            content = content.slice(0, nextLineIndex) + "\ndotenv.config();\n" + content.slice(nextLineIndex);
          }
        }
      }
      
      // Fix axios imports - ensure correct syntax (separate imports)
      content = content.replace(/import\s+axios\s*,\s*\{\s*AxiosResponse\s*\}\s*from\s*['"]axios['"]/g, 
        "import axios from 'axios';\nimport type { AxiosResponse } from 'axios'");
      content = content.replace(/import\s+axios\s*,\s*\{\s*AxiosError\s*\}\s*from\s*['"]axios['"]/g, 
        "import axios from 'axios';\nimport type { AxiosResponse } from 'axios'");
      
      // Ensure all default headers are included in headers object
      if (defaultHeaders && Object.keys(defaultHeaders).length > 0) {
        // Check if headers are set in the endpoint step
        const endpointStepRegex = /Given\([^)]*endpoint[^)]*\)[^}]*\{[^}]*this\.headers\s*=\s*\{([^}]*)\}/gs;
        content = content.replace(endpointStepRegex, (match, headersContent) => {
          // Check if all default headers are present
          const missingHeaders: string[] = [];
          for (const [key, value] of Object.entries(defaultHeaders)) {
            if (!headersContent.includes(`'${key}'`) && !headersContent.includes(`"${key}"`)) {
              missingHeaders.push(`    '${key}': '${value}',`);
            }
          }
          
          // Add missing headers before the closing brace
          if (missingHeaders.length > 0) {
            // Remove trailing comma if present
            const cleanedHeaders = headersContent.trim().replace(/,$/, '');
            return match.replace(headersContent, cleanedHeaders + (cleanedHeaders ? ',\n' : '') + missingHeaders.join('\n'));
          }
          return match;
        });
      }
      
      // Fix data table parsing - replace rowsHash() with hashes() for multi-column tables
      // This is a heuristic - if we see rowsHash() being used, it's likely wrong for multi-column tables
      content = content.replace(/dataTable\.rowsHash\(\)/g, 'dataTable.hashes()');
      
      // Fix request body parsing - ensure we extract first row from hashes() with null check
      content = content.replace(
        /const\s+(\w+)\s*=\s*dataTable\.hashes\(\)\s*;\s*this\.requestBody\s*=\s*\1\s*;/g,
        'const rows = dataTable.hashes();\n  const $1 = rows[0];\n  this.requestBody = $1;'
      );
      
      // Fix duplicate else statements - remove multiple else blocks (more aggressive)
      // Pattern: } else { ... } else { ... } else { ... }
      let previousContent = '';
      while (content !== previousContent) {
        previousContent = content;
        // Remove duplicate else blocks
        content = content.replace(
          /(\}\s*else\s*\{[^}]*\})\s*else\s*\{[^}]*\}/g,
          '$1'
        );
        // Fix cases where else appears multiple times on same line or consecutive lines
        content = content.replace(
          /(\}\s*else\s*\{[^}]*\}\s*)\s*else\s*\{/g,
          '$1'
        );
        // Fix malformed else blocks with extra closing braces
        content = content.replace(
          /(\}\s*else\s*\{[^}]*\}\s*)\s*else\s*\{[^}]*\}\s*else\s*\{/g,
          '$1'
        );
      }
      
      // Fix malformed request body assignments - remove duplicate assignments
      // Pattern: this.requestBody = { ... }; this.requestBody = {};
      content = content.replace(
        /(this\.requestBody\s*=\s*\{[^}]*\};\s*)\s*this\.requestBody\s*=\s*\{\};/g,
        '$1'
      );
      
      // Fix cases where requestBody is set inside if block but then overwritten outside
      content = content.replace(
        /(if\s*\([^)]*\)\s*\{[^}]*this\.requestBody\s*=\s*\{[^}]*\};\s*)\s*this\.requestBody\s*=\s*\{\};/g,
        '$1'
      );
      
      // Fix data table parsing - for positive tests, don't add if/else if not needed
      // Only add if/else for negative tests or when explicitly handling missing data
      // For positive tests with data tables, just use: const rows = dataTable.hashes(); const data = rows[0];
      const isNegativeTest = content.includes('without') || content.includes('missing') || content.includes('invalid');
      if (!isNegativeTest) {
        // For positive tests, simplify - remove unnecessary if/else
        content = content.replace(
          /const\s+rows\s*=\s*dataTable\.hashes\(\);\s*\n\s*if\s*\(rows\s*&&\s*rows\.length\s*>\s*0\)\s*\{\s*\n\s*const\s+(\w+)\s*=\s*rows\[0\];\s*\n\s*this\.requestBody\s*=\s*\{([^}]*)\};\s*\n\s*\}\s*else\s*\{\s*\n\s*this\.requestBody\s*=\s*\{\};\s*\n\s*\}/g,
          'const rows = dataTable.hashes();\n  const $1 = rows[0];\n  this.requestBody = {$2};'
        );
      }
      
      // Fix malformed headers object with broken template literals
      // Pattern: `Bearer `${process.env.OAUTH_TOKEN,` -> `Bearer ${process.env.OAUTH_TOKEN}`
      content = content.replace(
        /`Bearer\s*`\s*\$\{process\.env\.([^}]*),/g,
        '`Bearer ${process.env.$1}'
      );
      
      // Fix specific pattern: `Bearer ${process.env.OAUTH_TOKEN,` -> `Bearer ${process.env.OAUTH_TOKEN}`
      content = content.replace(
        /`Bearer\s*\$\{process\.env\.([^}]*),/g,
        '`Bearer ${process.env.$1}'
      );
      
      // Fix duplicate Authorization headers and malformed structure
      // Pattern: 'Authorization': `Bearer ,\n    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
      content = content.replace(
        /'Authorization':\s*`Bearer\s*,\s*\n\s*'Authorization':\s*`Bearer\s*\$\{process\.env\.([^}]*)\}`/g,
        "'Authorization': `Bearer ${process.env.$1}`"
      );
      
      // Fix malformed headers with extra closing braces and quotes
      // Pattern: 'x-submitter-id': '10'\n  }}\`\n  };
      content = content.replace(
        /('x-submitter-id':\s*'[^']*')\s*\}\}`\s*\n\s*\};/g,
        "$1\n  };"
      );
      
      // Remove duplicate Authorization headers (keep the last one)
      const duplicateAuthPattern = /('Authorization':\s*`[^`]*`),\s*\n\s*'Authorization':\s*`([^`]*)`/g;
      content = content.replace(duplicateAuthPattern, "'Authorization': `$2`");
      
      // Fix headers object with broken structure like: {'key': 'value', 'key2': `template${var,`key3': 'value'}`}`
      content = content.replace(
        /this\.headers\s*=\s*\{([^}]*)\$\{([^}]*),([^}]*)\}/g,
        (match, before, varName, after) => {
          // Fix the broken template literal - find where it should end
          const fixedBefore = before.replace(/,\s*$/, '');
          const fixedAfter = after.replace(/^[^}]*\}\}/, '').replace(/^[^}]*\}/, '');
          return `this.headers = {\n    ${fixedBefore},\n    'Authorization': \`Bearer \${${varName}}\`${fixedAfter ? ',\n    ' + fixedAfter : ''}\n  }`;
        }
      );
      
      // More aggressive fix for completely broken headers structure
      // Pattern: {'Content-Type': 'application/json', 'Authorization': `Bearer `${process.env.OAUTH_TOKEN, 'x-submitter-id': '10'}`}`
      const brokenHeadersPattern = new RegExp(
        "this\\.headers\\s*=\\s*\\{'Content-Type':\\s*'application/json',\\s*'Authorization':\\s*`Bearer\\s*`\\s*\\$\\{process\\.env\\.([^}]*),\\s*'x-submitter-id':\\s*'([^']*)'\\}\\}`\\s*\\};",
        'g'
      );
      content = content.replace(
        brokenHeadersPattern,
        "this.headers = {\n    'Content-Type': 'application/json',\n    'x-submitter-id': '$2',\n    'Authorization': `Bearer ${process.env.$1}`\n  };"
      );
      
      // Fix headers object with trailing commas and broken structure
      content = content.replace(
        /this\.headers\s*=\s*\{([^}]*'[^']*':\s*[^,}]*),([^}]*)\}/g,
        (match, before, after) => {
          // Remove trailing commas and fix structure
          const cleaned = before.replace(/,\s*$/, '') + (after ? ',' + after : '');
          return `this.headers = {${cleaned}}`;
        }
      );
      
      // FINAL PASS: Always rebuild headers if they contain any malformed patterns (after all other fixes)
      content = this.finalHeadersFix(content, defaultHeaders, useOAuth, oauthTokenEnvVar);
      
      // FINAL PASS: Remove duplicate else statements (run after all other fixes)
      content = this.removeDuplicateElseStatements(content);
      
      // Remove duplicate import lines
      const lines = content.split('\n');
      const seenImports = new Set<string>();
      const cleanedLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('import')) {
          const importKey = line.trim().replace(/\s+/g, ' ');
          if (!seenImports.has(importKey)) {
            seenImports.add(importKey);
            cleanedLines.push(line);
          }
        } else {
          cleanedLines.push(line);
        }
      }
      content = cleanedLines.join('\n');
      
      // Fix error handling patterns - ensure proper structure
      // Replace common broken patterns with correct error handling
      const errorHandlingPattern = /catch\s*\([^)]*\)\s*\{([^}]*)\}/g;
      content = content.replace(errorHandlingPattern, (match, body) => {
        // If error handling doesn't properly set this.response, fix it
        if (!body.includes('this.response = error.response')) {
          return `catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      this.response = error.response;
    } else if (axios.isAxiosError(error)) {
      this.response = error.response;
    } else {
      throw error;
    }
  }`;
        }
        return match;
      });
      
      return content;
      
    } catch (error: any) {
      throw new Error(`Failed to generate step definitions: ${error.message}`);
    }
  }

  /**
   * Apply ALL fixes comprehensively in the correct order
   */
  private applyAllFixes(
    content: string,
    cucumberFeature: string,
    defaultHeaders: Record<string, string>,
    useOAuth: boolean,
    oauthTokenEnvVar: string,
    baseUrl: string
  ): string {
    // STEP 1: Fix headers FIRST (before anything else touches them)
    content = this.fixHeadersObject(content, defaultHeaders, useOAuth, oauthTokenEnvVar, baseUrl);
    
    // STEP 2: Fix dataTable parameters
    content = this.fixDataTableParameters(content, cucumberFeature);
    
    // STEP 3: Fix request body issues (duplicate assignments, overwrites)
    content = this.fixRequestBodyIssues(content, cucumberFeature);
    
    // STEP 4: Fix duplicate else statements
    content = this.removeDuplicateElseStatements(content);
    
    // STEP 5: Final headers validation (rebuild if still malformed)
    content = this.finalHeadersFix(content, defaultHeaders, useOAuth, oauthTokenEnvVar);
    
    return content;
  }

  /**
   * Fix request body issues - duplicate assignments, overwrites, malformed structures
   */
  private fixRequestBodyIssues(content: string, cucumberFeature: string): string {
    // Fix duplicate requestBody assignments on consecutive lines
    content = content.replace(
      /(this\.requestBody\s*=\s*\{[^}]*\};\s*)\s*this\.requestBody\s*=\s*\{\};/g,
      '$1'
    );
    
    // Fix requestBody set inside if block then overwritten outside
    content = content.replace(
      /(if\s*\([^)]*\)\s*\{[^}]*this\.requestBody\s*=\s*\{[^}]*\};\s*)\s*this\.requestBody\s*=\s*\{\};/g,
      '$1'
    );
    
    // Fix malformed requestBody with extra closing braces or syntax errors
    content = content.replace(
      /this\.requestBody\s*=\s*\{([^}]*)\};\s*\}\s*else\s*\{/g,
      'this.requestBody = {$1};\n  } else {'
    );
    
    // For positive tests, simplify - remove unnecessary if/else when data table has data
    const isNegativeTest = cucumberFeature.includes('without') || cucumberFeature.includes('missing') || cucumberFeature.includes('invalid');
    if (!isNegativeTest) {
      // Remove unnecessary if/else for positive tests with data tables
      content = content.replace(
        /const\s+rows\s*=\s*dataTable\.hashes\(\);\s*\n\s*if\s*\(rows\s*&&\s*rows\.length\s*>\s*0\)\s*\{\s*\n\s*const\s+(\w+)\s*=\s*rows\[0\];\s*\n\s*this\.requestBody\s*=\s*\{([^}]*)\};\s*\n\s*\}\s*else\s*\{\s*\n\s*this\.requestBody\s*=\s*\{\};\s*\n\s*\}/g,
        'const rows = dataTable.hashes();\n  const $1 = rows[0];\n  this.requestBody = {$2};'
      );
    }
    
    return content;
  }

  /**
   * Comprehensive fix for headers object - rebuilds it completely if malformed
   */
  private fixHeadersObject(
    content: string,
    defaultHeaders: Record<string, string>,
    useOAuth: boolean,
    oauthTokenEnvVar: string,
    baseUrl: string
  ): string {
    // Find all endpoint step definitions - use more flexible regex
    const endpointStepRegex = /Given\([^)]*endpoint[^)]*\)[^}]*\{[^}]*this\.headers\s*=\s*\{[^}]*\}[^}]*\}/gs;
    
    return content.replace(endpointStepRegex, (match) => {
      // Extract the headers assignment part - be more flexible with multiline
      const headersMatch = match.match(/this\.headers\s*=\s*\{([\s\S]*?)\}/);
      if (!headersMatch) {
        return match; // Can't find headers, skip
      }
      
      // Check if headers are malformed (has syntax errors, duplicates, broken template literals)
      const headersContent = headersMatch[1];
      const isMalformed = 
        headersContent.includes('`Bearer ,') ||
        headersContent.includes('`Bearer `') ||
        headersContent.includes('}}`') ||
        headersContent.includes('`Bearer ,') ||
        (headersContent.match(/'Authorization'/g) || []).length > 1 ||
        (headersContent.includes('${process.env.') && !headersContent.includes('`Bearer ${process.env.')) ||
        headersContent.includes('Authorization') && headersContent.includes('Bearer ,');
      
      if (isMalformed) {
        // Rebuild headers object completely
        const headers: string[] = [];
        
        // Add all default headers first
        for (const [key, value] of Object.entries(defaultHeaders)) {
          headers.push(`    '${key}': '${value}',`);
        }
        
        // Add Authorization header if OAuth is needed
        if (useOAuth) {
          headers.push(`    'Authorization': \`Bearer \${process.env.${oauthTokenEnvVar}}\``);
        }
        
        // Replace the malformed headers with correct structure
        const fixedHeaders = `this.headers = {\n${headers.join('\n')}\n  };`;
        return match.replace(/this\.headers\s*=\s*\{[\s\S]*?\}/, fixedHeaders);
      }
      
      return match;
    });
  }

  /**
   * Ensure dataTable parameter is included when feature file has data tables
   */
  private fixDataTableParameters(content: string, cucumberFeature: string): string {
    // Check if feature file has data tables
    const hasDataTable = cucumberFeature.includes('|') && cucumberFeature.match(/\|.*\|/);
    
    if (!hasDataTable) {
      return content;
    }
    
    // Find step definitions that should accept dataTable but don't
    // Look for steps that set requestBody but don't have dataTable parameter
    // Match both "request body" and "does not include" patterns
    const requestBodyStepRegex = /(Given|When|Then|And|But)\([^)]*(?:request\s+body|does\s+not\s+include)[^)]*\)\s*function\s*\(this:\s*CustomWorld\)\s*\{/gi;
    
    return content.replace(requestBodyStepRegex, (match) => {
      // Add dataTable parameter if not already present
      if (!match.includes('dataTable')) {
        return match.replace('function (this: CustomWorld) {', 'function (this: CustomWorld, dataTable) {');
      }
      return match;
    });
  }

  /**
   * Remove duplicate else statements that may have been created by multiple regex replacements
   */
  private removeDuplicateElseStatements(content: string): string {
    // Remove duplicate else blocks - pattern: } else { ... } else { ... }
    let previousContent = '';
    let iterations = 0;
    while (content !== previousContent && iterations < 10) {
      previousContent = content;
      iterations++;
      
      // Pattern 1: } else { ... } else { ... }
      content = content.replace(
        /(\}\s*else\s*\{[^}]*\})\s*else\s*\{[^}]*\}/g,
        '$1'
      );
      
      // Pattern 2: Multiple else on same line or consecutive
      content = content.replace(
        /(\}\s*else\s*\{[^}]*\}\s*)\s*else\s*\{/g,
        '$1'
      );
      
      // Pattern 3: Malformed with extra braces: };  } else { ... } else {
      content = content.replace(
        /(\};\s*)\s*\}\s*else\s*\{[^}]*\}\s*else\s*\{/g,
        '$1'
      );
      
      // Pattern 4: Fix cases where else appears after closing brace of requestBody
      content = content.replace(
        /(this\.requestBody\s*=\s*\{[^}]*\};\s*)\s*\}\s*else\s*\{/g,
        '$1'
      );
    }
    
    return content;
  }

  /**
   * Final pass to fix any remaining header issues - always rebuilds if malformed patterns found
   */
  private finalHeadersFix(
    content: string,
    defaultHeaders: Record<string, string>,
    useOAuth: boolean,
    oauthTokenEnvVar: string
  ): string {
    // Find ALL headers assignments (multiline regex)
    const headersRegex = /this\.headers\s*=\s*\{([\s\S]*?)\n\s*\};/g;
    
    return content.replace(headersRegex, (match, headersContent) => {
      // Check for ANY malformed patterns
      const isMalformed = 
        headersContent.includes('`Bearer ,') ||
        headersContent.includes('`Bearer `') ||
        headersContent.includes('}}`') ||
        (headersContent.match(/'Authorization'/g) || []).length > 1 ||
        headersContent.includes('Authorization') && headersContent.includes('Bearer ,') ||
        (headersContent.includes('${process.env.') && !headersContent.includes('`Bearer ${process.env.'));
      
      if (isMalformed) {
        // Rebuild headers object completely
        const headers: string[] = [];
        
        // Add all default headers first
        for (const [key, value] of Object.entries(defaultHeaders)) {
          headers.push(`    '${key}': '${value}',`);
        }
        
        // Add Authorization header if OAuth is needed
        if (useOAuth) {
          headers.push(`    'Authorization': \`Bearer \${process.env.${oauthTokenEnvVar}}\``);
        }
        
        // Return the fixed headers
        return `this.headers = {\n${headers.join('\n')}\n  };`;
      }
      
      return match;
    });
  }

  /**
   * Write feature file to disk
   */
  writeFeatureFile(scenario: TestScenario, content: string, service?: string, category?: string): string {
    // Organize by service/category if provided
    let featuresDir = path.join(process.cwd(), 'features', 'api');
    if (service) {
      featuresDir = path.join(featuresDir, service);
      if (category) {
        featuresDir = path.join(featuresDir, category);
      }
    }
    
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
    }

    const filename = this.sanitizeFilename(scenario.name) + '.feature';
    const filePath = path.join(featuresDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write step definition file to disk
   */
  writeStepDefinitionFile(scenario: TestScenario, content: string, service?: string): string {
    // Organize by service if provided
    let stepsDir = path.join(process.cwd(), 'src', 'steps', 'api');
    if (service) {
      stepsDir = path.join(stepsDir, service);
    }
    
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }

    const filename = this.sanitizeFilename(scenario.name) + '.steps.ts';
    const filePath = path.join(stepsDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Get base URL from spec
   * Defaults to staging environment for AVS API
   * @deprecated Use getTeamBaseUrl from team-config.ts instead
   */
  getBaseUrl(spec: any): string {
    // Check for AVS API and use staging by default
    const apiTitle = spec.info?.title || '';
    if (apiTitle.includes('AVS') || apiTitle.includes('Address Validation')) {
      return 'https://avs.scff.stg.chewy.com';
    }
    
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }
    
    const schemes = spec.schemes || ['https'];
    const host = spec.host || 'api.example.com';
    const basePath = spec.basePath || '';
    
    return `${schemes[0]}://${host}${basePath}`;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

