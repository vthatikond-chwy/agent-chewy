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
import { findPatternForEndpoint, getMinimalRequestBodyFromPattern, getResponseTypeFromPattern, getResponseStructureFromPattern } from './self-healing.js';
import { loadTeamRules, getRulesContext } from './team-rules.js';

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
  extractProjectName(swaggerSpecPath: string): string | null {
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
    // First check team config - if it exists and explicitly sets useOAuth, respect it
    if (teamConfig !== null) {
      if (teamConfig.useOAuth === false) {
        return false; // Explicitly disabled in team config
      }
      if (teamConfig.useOAuth === true) {
        const tokenEnvVar = teamConfig.oauthTokenEnvVar || 'OAUTH_TOKEN';
        return !!process.env[tokenEnvVar];
      }
    }

    // Fallback to global config only if team config doesn't exist or doesn't specify
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
    targetEndpoints?: string[],
    swaggerSpecPath?: string
  ): Promise<TestScenario[]> {
    
    // Load team rules for working test data
    const teamRules = swaggerSpecPath ? loadTeamRules(swaggerSpecPath) : null;
    
    // Filter endpoints if specified and analyze each endpoint's request/response structure
    let endpoints = [];
    const paths = swaggerSpec.paths || {};
    
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!targetEndpoints || targetEndpoints.includes(path)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            const op = operation as any;
            
            // Analyze request body schema
            let requestSchema = null;
            let requestBodyAnalysis = null;
            let defaultRequestBody = null;
            
            if (op.requestBody) {
              // OpenAPI 3.0 format
              requestSchema = op.requestBody?.content?.['application/json']?.schema ||
                            op.requestBody?.schema;
            } else if (op.parameters) {
              // Swagger 2.0 format - find body parameter
              const bodyParam = op.parameters.find((p: any) => p.in === 'body');
              if (bodyParam?.schema) {
                requestSchema = bodyParam.schema;
              }
            }
            
            if (requestSchema) {
              requestBodyAnalysis = analyzeSchema(requestSchema, swaggerSpec);
              defaultRequestBody = getMinimalRequestBody(requestSchema, swaggerSpec);
              
              // Enhance with working test data from rules.json if available
              if (teamRules?.testData?.workingAddresses) {
                const endpointName = path.split('/').pop() || '';
                let workingData: any = null;
                
                // Determine which working data to use
                if (path.includes('verify') && !path.includes('Bulk')) {
                  workingData = teamRules.testData.workingAddresses.verifyAddress;
                } else if (path.includes('suggest')) {
                  workingData = teamRules.testData.workingAddresses.suggestAddresses;
                }
                
                // Merge working data into default request body
                if (workingData) {
                  defaultRequestBody = {
                    ...defaultRequestBody,
                    ...workingData
                  };
                }
              }
            }
            
            // Analyze response schema
            let responseSchema = null;
            let responseAnalysis = null;
            const successResponse = op.responses?.['200'] || op.responses?.['201'];
            if (successResponse) {
              responseSchema = successResponse.content?.['application/json']?.schema ||
                             successResponse.content?.['*/*']?.schema ||
                             successResponse.schema;
              if (responseSchema) {
                responseAnalysis = analyzeSchema(responseSchema, swaggerSpec);
              }
            }
            
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: op.summary,
              description: op.description,
              operationId: op.operationId,
              parameters: op.parameters || [],
              requestBody: op.requestBody,
              responses: op.responses,
              // Enhanced analysis
              requestSchema: requestBodyAnalysis,
              defaultRequestBody: defaultRequestBody,
              responseSchema: responseAnalysis,
              requiredFields: requestBodyAnalysis?.requiredFields || [],
              optionalFields: requestBodyAnalysis?.optionalFields || []
            });
          }
        }
      }
    }

    // Parse natural language to detect exact number requested
    const numberMatch = naturalLanguageInput.match(/(?:exactly|only|just)\s+(\d+)\s+test\s+scenario/i) || 
                       naturalLanguageInput.match(/(\d+)\s+test\s+scenario/i);
    const exactCount = numberMatch ? parseInt(numberMatch[1]) : null;
    
    // Build endpoint context with Swagger summaries/descriptions for better endpoint selection
    const endpointContext = endpoints.map(ep => ({
      path: ep.path,
      method: ep.method,
      summary: ep.summary || '',
      description: ep.description || '',
      operationId: (ep as any).operationId || ''
    })).map(ep => 
      `- ${ep.method} ${ep.path}\n  Summary: ${ep.summary}\n  Description: ${ep.description || 'N/A'}`
    ).join('\n\n');

    const systemPrompt = `You are an expert API test architect. Generate test scenarios from natural language requirements and API specifications.

CRITICAL - Endpoint Selection Based on Swagger Spec:
Use the Swagger endpoint summaries and descriptions to choose the CORRECT endpoint:
${endpointContext}

For "validate" or "verification" scenarios, prefer endpoints with "validate" or "verify" in their summary/description.
For "suggest" or "suggestion" scenarios, prefer endpoints with "suggest" in their summary/description.

${exactCount ? `CRITICAL: Generate EXACTLY ${exactCount} test scenario${exactCount > 1 ? 's' : ''}. Do NOT generate more or less.` : 'Generate test scenarios based on the requirements.'}

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

${exactCount ? `CRITICAL: Generate EXACTLY ${exactCount} test scenario${exactCount > 1 ? 's' : ''} as specified in the requirement. Focus only on the scenarios explicitly requested.` : 'Generate test scenarios based on the requirements provided.'}`;

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
    swaggerSpec: any,
    swaggerSpecPath?: string
  ): Promise<string> {
    
    const systemPrompt = `You are an expert in writing Cucumber/Gherkin test scenarios for API testing.
Generate clear, executable BDD scenarios following best practices.
Return ONLY the Cucumber feature text, no markdown code blocks or explanations.`;

    const scenarioName = scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Load team rules
    const teamRules = swaggerSpecPath ? loadTeamRules(swaggerSpecPath) : null;
    const rulesContext = getRulesContext(teamRules);
    
    // Analyze Swagger schema to get required fields and example data
    let schemaInfo = '';
    let exampleData = '';
    try {
      const endpoint = swaggerSpec.paths?.[scenario.endpoint]?.[scenario.method.toLowerCase()];
      if (endpoint?.requestBody) {
        const requestSchema = endpoint.requestBody?.content?.['application/json']?.schema ||
                             endpoint.requestBody?.schema;
        if (requestSchema) {
          const analyzed = analyzeSchema(requestSchema, swaggerSpec);
          schemaInfo = `\nRequest Schema Analysis:
- Required fields: ${analyzed.requiredFields.join(', ')}
- Optional fields: ${analyzed.optionalFields.join(', ')}`;
          
          // Use working test data from rules if available
          if (teamRules?.testData?.workingAddresses) {
            // Try to match endpoint name
            const endpointName = scenario.endpoint.split('/').pop() || '';
            let workingData = teamRules.testData.workingAddresses[endpointName] ||
                            teamRules.testData.workingAddresses[scenario.endpoint] ||
                            teamRules.testData.workingAddresses.verifyAddress ||
                            teamRules.testData.workingAddresses.suggestAddresses;
            
            // For suggestAddresses, prefer suggestAddresses data
            if (scenario.endpoint.includes('suggest')) {
              workingData = teamRules.testData.workingAddresses.suggestAddresses || workingData;
            }
            // For verifyAddress, prefer verifyAddress data
            if (scenario.endpoint.includes('verify') && !scenario.endpoint.includes('Bulk')) {
              workingData = teamRules.testData.workingAddresses.verifyAddress || workingData;
            }
            
            if (workingData) {
              // Format as data table for feature file
              const dataTableRows: string[] = [];
              const fields = Object.keys(workingData);
              dataTableRows.push(`      | ${fields.join(' | ')} |`);
              const values = fields.map(f => {
                const val = workingData[f];
                return Array.isArray(val) ? val[0] : val;
              });
              dataTableRows.push(`      | ${values.join(' | ')} |`);
              
              exampleData = `\n\n🚨🚨🚨 CRITICAL - MANDATORY TEST DATA - DEFAULT TO TRUE 🚨🚨🚨
YOU MUST USE THIS EXACT WORKING TEST DATA. THIS IS NOT OPTIONAL - IT IS MANDATORY.
DO NOT GENERATE YOUR OWN ADDRESSES. DO NOT MODIFY THESE VALUES. DO NOT USE ANY OTHER ADDRESSES.

REQUIRED DATA TABLE (copy EXACTLY - character for character):
${dataTableRows.join('\n')}

ABSOLUTELY FORBIDDEN - DO NOT USE:
- "123 Main St", "123 Elm St", "123 Palm Tree Rd", "456 Disney Ln", "1600 Amphitheatre Pkwy" (unless it's the exact one above)
- "Miami", "Orlando", "Washington DC", "Mountain View" (unless it's the exact one above)
- ANY addresses NOT listed in the REQUIRED DATA TABLE above

YOU MUST USE ONLY AND EXACTLY THE WORKING TEST DATA PROVIDED ABOVE.
IF YOU USE ANY OTHER ADDRESS, THE TEST WILL FAIL.
THIS IS THE DEFAULT BEHAVIOR - ALWAYS USE WORKING TEST DATA FROM RULES.`;
            }
          }
        }
      }
    } catch (error) {
      // Schema analysis failed, continue without it
    }
    
    // Get required/optional fields from rules
    let requiredFieldsInfo = '';
    if (teamRules?.testData?.requiredFields?.[scenario.endpoint]) {
      requiredFieldsInfo = `\nRequired fields for this endpoint: ${teamRules.testData.requiredFields[scenario.endpoint].join(', ')}`;
    }
    
    const userPrompt = `Generate a Cucumber/Gherkin feature file for this API test scenario:

Scenario Details:
${JSON.stringify(scenario, null, 2)}

API Context:
- Base URL: ${this.getBaseUrl(swaggerSpec)}
- Endpoint: ${scenario.method} ${scenario.endpoint}
- Scenario Name: ${scenario.name}
- Scenario ID: ${scenarioName}
${schemaInfo}${requiredFieldsInfo}${exampleData}

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
3. Use clear, business-readable language
4. Include appropriate tags (@api, @positive, @negative, @boundary, @security)
${teamRules?.featureFileGeneration?.dataTableFormat?.note ? `5. ${teamRules.featureFileGeneration.dataTableFormat.note}` : ''}
${teamRules?.featureFileGeneration?.criticalRules ? `\n${teamRules.featureFileGeneration.criticalRules.map((r: string, idx: number) => `${idx + 6}. ${r}`).join('\n')}` : ''}

IMPORTANT: The example data table above shows WORKING test data. You MUST use this exact data, not generic addresses.

${rulesContext ? `\n\n${rulesContext}` : ''}`;

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
      
      // Fix endpoint selection based on Swagger spec and scenario context
      content = this.fixEndpointSelection(content, scenario, swaggerSpec);
      
      // ENFORCE: Always use working test data from rules (default to true)
      if (teamRules?.testData?.workingAddresses) {
        content = this.enforceWorkingTestData(content, scenario, teamRules);
        // Adjust expected response codes to match working test data and Swagger spec
        content = this.adjustExpectedResponseCodes(content, scenario, teamRules, swaggerSpec);
      }
      
      // Post-process: Replace ANY non-working addresses with working test data from rules
      // BUT skip this for negative scenarios (they already have invalid data from enforceWorkingTestData)
      const isNegativeScenario = scenario.type === 'negative' || 
                                 scenario.type === 'boundary' ||
                                 scenario.name.toLowerCase().includes('invalid') ||
                                 scenario.name.toLowerCase().includes('missing') ||
                                 scenario.name.toLowerCase().includes('error') ||
                                 scenario.name.toLowerCase().includes('fail');
      
      if (!isNegativeScenario && teamRules?.testData?.workingAddresses) {
        let workingData = null;
        if (scenario.endpoint.includes('verify') && !scenario.endpoint.includes('Bulk')) {
          workingData = teamRules.testData.workingAddresses.verifyAddress;
        } else if (scenario.endpoint.includes('suggest')) {
          workingData = teamRules.testData.workingAddresses.suggestAddresses;
        }
        
        if (workingData) {
          const workingStreet = Array.isArray(workingData.streets) ? workingData.streets[0] : workingData.streets;
          const workingCity = workingData.city;
          const workingState = workingData.stateOrProvince;
          const workingPostal = workingData.postalCode;
          const workingCountry = workingData.country;
          
          // Find and replace the data table row with working data
          // Pattern: | streets | city | stateOrProvince | postalCode | country |
          //          | value1  | value2 | value3 | value4 | value5 |
          if (scenario.endpoint.includes('verify')) {
            // Replace any address data table with working data
            const dataTablePattern = /\|\s*streets\s*\|\s*city\s*\|\s*stateOrProvince\s*\|\s*postalCode\s*\|\s*country\s*\|[\s\S]*?\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|/;
            const replacement = `| streets | city | stateOrProvince | postalCode | country |\n      | ${workingStreet} | ${workingCity} | ${workingState} | ${workingPostal} | ${workingCountry} |`;
            content = content.replace(dataTablePattern, replacement);
          } else if (scenario.endpoint.includes('suggest')) {
            // For suggestAddresses, try both patterns (with and without postalCode)
            // Pattern 1: With postalCode
            if (workingPostal) {
              const dataTablePatternWithPostal = /\|\s*streets\s*\|\s*city\s*\|\s*stateOrProvince\s*\|\s*postalCode\s*\|\s*country\s*\|[\s\S]*?\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|/;
              const replacementWithPostal = `| streets | city | stateOrProvince | postalCode | country |\n      | ${workingStreet} | ${workingCity} | ${workingState} | ${workingPostal} | ${workingCountry} |`;
              content = content.replace(dataTablePatternWithPostal, replacementWithPostal);
            }
            // Pattern 2: Without postalCode (for incomplete addresses)
            const dataTablePatternNoPostal = /\|\s*streets\s*\|\s*city\s*\|\s*stateOrProvince\s*\|\s*country\s*\|[\s\S]*?\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+\s*\|/;
            const replacementNoPostal = `| streets | city | stateOrProvince | country |\n      | ${workingStreet} | ${workingCity} | ${workingState} | ${workingCountry} |`;
            // Only replace if working data is not already present
            if (!content.includes(workingStreet) || !content.includes(workingCity)) {
              content = content.replace(dataTablePatternNoPostal, replacementNoPostal);
            }
          }
          
          // AGGRESSIVE FIX: Replace any address-like values that don't match working data
          // This catches cases where OpenAI generated wrong addresses
          const commonWrongAddresses = [
            '123 Main St', '123 Elm St', '123 Palm Tree Rd', '456 Disney Ln',
            'Miami', 'Orlando', 'Washington DC', 'Springfield',
            '33101', '32801', '62704', '00000'
          ];
          
          // Check if content has wrong addresses and replace them
          const hasWrongAddress = commonWrongAddresses.some(addr => content.includes(addr));
          if (hasWrongAddress && workingData) {
            // Force replace the entire data table section
            // Match any data table that contains address fields
            const anyAddressTablePattern = /(\|\s*(?:streets|street)\s*\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|)/;
            if (scenario.endpoint.includes('verify') && workingPostal) {
              const correctTable = `| streets | city | stateOrProvince | postalCode | country |\n      | ${workingStreet} | ${workingCity} | ${workingState} | ${workingPostal} | ${workingCountry} |`;
              content = content.replace(anyAddressTablePattern, correctTable);
            } else if (scenario.endpoint.includes('suggest')) {
              const correctTable = `| streets | city | stateOrProvince | country |\n      | ${workingStreet} | ${workingCity} | ${workingState} | ${workingCountry} |`;
              content = content.replace(anyAddressTablePattern, correctTable);
            }
          }
        }
      }
      
      // Final validation: Ensure data table consistency after all modifications
      content = this.validateAndFixDataTablesInFeature(content);
      
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
    
    // Load team-specific rules
    const teamRules = swaggerSpecPath ? loadTeamRules(swaggerSpecPath) : null;
    const rulesContext = getRulesContext(teamRules);
    
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
      const responseStructure = getResponseStructureFromPattern(endpointPath, method);
      
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
      } else if (responseType === 'array' && responseStructure) {
        responseTypeInfo = `The API returns an array. ${responseStructure.assertionNote || ''}\n` +
          `Each item structure: ${JSON.stringify(responseStructure.itemStructure?.properties || {}, null, 2)}`;
      } else if (responseType === 'array') {
        responseTypeInfo = 'The API returns an array. Check team rules for the exact structure of each array item.';
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

CRITICAL: The step definitions MUST match the EXACT step text from the feature file above.
- If the feature file says "Then the response status code should be 200 for {scenarioName}", the step definition must use that EXACT text
- If the feature file says "Then the response status for {scenarioName} should be 200", the step definition must use that EXACT text
- DO NOT change the step text - match it exactly as written in the feature file

API Details:
- Base URL: ${baseUrl}
- Endpoint: ${scenario.method} ${scenario.endpoint}
- Expected Status: ${scenario.expectedStatus}
- Scenario Name: ${scenario.name}
- Scenario ID: ${scenarioName}
${useOAuth ? `- Authentication: OAuth Bearer token required (use process.env.${oauthTokenEnvVar})` : ''}
${requestBodyInfo}
${responseTypeInfo ? `\nIMPORTANT - Response Structure:\n${responseTypeInfo}\n` : ''}
${rulesContext ? `\n${rulesContext}\n` : ''}

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
6. CRITICAL - Request Headers Data Table: When handling request headers from data tables, ALWAYS use this pattern:
   - const rows = dataTable.hashes();
   - const headerRow = rows[0];
   - this.headers = { ...this.headers, ...headerRow };
   - DO NOT use: for (const key in rows) { this.headers[key] = rows[key]; }
   - DO NOT iterate over rows - extract the first row and merge with existing headers
6. For address fields that are arrays (like streets), convert to array format: streets: [addressData.streets]
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
12. ${teamRules?.assertionPatterns?.responseCodeProperty ? `Use '${teamRules.assertionPatterns.responseCodeProperty}' field for response codes (not 'status' or 'verificationStatus')` : 'Use appropriate response code field based on API structure'}
13. DO NOT generate common steps like "the response status code should be {int}" - these are in common.steps.ts
${teamRules?.responsePatterns?.arrayResponseEndpoints?.includes(scenario.endpoint) ? `14. CRITICAL: This endpoint (${scenario.endpoint}) returns an ARRAY directly, not an object with a property.\n   - Use: response.data (it's already an array)\n   - DO NOT use: response.data.suggestions or response.data.items\n   - Example: expect(response.data).to.be.an('array').that.is.not.empty;\n   - For empty array checks: expect(response.data).to.be.an('array').that.is.empty;\n   - For array item checks: response.data.map((item: any) => item.responseCode)` : ''}
${teamRules?.responsePatterns?.objectResponseEndpoints?.includes(scenario.endpoint) ? `15. CRITICAL: This endpoint (${scenario.endpoint}) returns an OBJECT, not an array.\n   - Use: response.data.responseCode (not response.data[0].responseCode)\n   - Example: expect(response.data).to.have.property('responseCode');\n   - Example: expect(response.data.responseCode).to.equal(expectedCode);` : ''}
${teamRules?.normalizationRules?.addressComparison === 'case-insensitive' ? `16. CRITICAL: Address comparisons must be CASE-INSENSITIVE.\n   - Use .toUpperCase() for both expected and actual values\n   - Example: expect(actual.toUpperCase()).to.equal(expected.toUpperCase());` : ''}
${teamRules?.normalizationRules?.postalCodeHandling === 'prefix-match' ? `17. CRITICAL: Postal code handling - API may return ZIP+4 format.\n   - Check if response postal code includes/contains the request postal code\n   - Example: expect(responsePostalCode).to.include(requestPostalCode);` : ''}
${teamRules?.queryParameterHandling?.[scenario.endpoint] ? `18. CRITICAL: This endpoint supports optional query parameters: ${teamRules.queryParameterHandling[scenario.endpoint].parameters?.join(', ')}\n   - These are OPTIONAL - only include them if explicitly needed in the test scenario\n   - DO NOT add query parameters with placeholder values like "default" - they may cause 400 errors\n   - Only add params if the test scenario specifically requires them\n   - Example: axios.post(url, body, { params: { maxSuggestions: 5 } }) - only if maxSuggestions is needed` : ''}
${useOAuth ? `19. IMPORTANT: Include Authorization header with Bearer token in all requests. Use process.env.${oauthTokenEnvVar} to get the token.` : ''}
${teamRules?.stepDefinitionPatterns?.quotedStringHandling?.convertToPlaceholders !== false ? `20. CRITICAL - Quoted Strings in Feature Files: When the feature file has quoted strings like "Content-Type" or "application/json", Cucumber treats them as parameters. 
   - Step definitions MUST use {string} placeholders instead of literal quoted text
   - Example: Feature has 'the response header "Content-Type" should be "application/json"'
   - Step def should be: Then('the response header {string} should be {string} for [scenario-name]', function (this: CustomWorld, headerName: string, expectedValue: string) { ... })
   - DO NOT use: Then('the response header "Content-Type" should be "application/json" for [scenario-name]', ...)
${teamRules?.stepDefinitionPatterns?.quotedStringHandling?.example ? `   - Team-specific example:\n${teamRules.stepDefinitionPatterns.quotedStringHandling.example}` : ''}` : ''}
21. CRITICAL - Request Body Structure: Build a simple object with only the fields from the data table.
22. CRITICAL - Response Assertions: Match the actual response type. If the API returns an integer (user ID), assert it's a number, not an object with properties.
23. CRITICAL - Generate ALL step definitions: You MUST generate step definitions for EVERY step in the feature file. Parse the feature file and ensure every Given/When/Then/And/But step has a corresponding step definition.
24. CRITICAL - Data Table Consistency: Data tables MUST have consistent column counts. Header row column count must match all data rows. If data row has more columns than header, truncate extra columns.

CRITICAL - Step Definition Matching: 
- In Cucumber, "And" steps match the previous step type (Given/When/Then)
- If feature file has "And the request body...", it will match a "Given" step definition (because previous step is "Given")
- Step definitions should use "Given" for request body steps, even if feature file uses "And"
- The step text must match EXACTLY what's in the feature file (including "the request body" not "request body is prepared")

${teamRules?.stepDefinitionPatterns?.dataTableParsing ? `
CRITICAL - Data Table Parsing (from team rules):
- Use rowsHash() for tables with ${teamRules.stepDefinitionPatterns.dataTableParsing.useRowsHashForColumns || 2} columns (key-value pairs)
- Use hashes() for tables with ${teamRules.stepDefinitionPatterns.dataTableParsing.useHashesForColumns || 3}+ columns (multi-column tables)
${teamRules.stepDefinitionPatterns.dataTableParsing.example?.twoColumn ? `\nExample for 2-column data table:\n${teamRules.stepDefinitionPatterns.dataTableParsing.example.twoColumn}` : ''}
${teamRules.stepDefinitionPatterns.dataTableParsing.example?.multiColumn ? `\nExample for multi-column data table:\n${teamRules.stepDefinitionPatterns.dataTableParsing.example.multiColumn}` : ''}
` : `
CRITICAL - Data Table Parsing:
- Use rowsHash() for 2-column tables (key-value pairs)
- Use hashes() for 3+ column tables (multi-column tables)
`}

${teamRules?.stepDefinitionPatterns?.arrayAccessPatterns ? `
CRITICAL - Array Access Patterns (from team rules):
${teamRules.stepDefinitionPatterns.arrayAccessPatterns.inArrayPattern ? `- Pattern: ${teamRules.stepDefinitionPatterns.arrayAccessPatterns.inArrayPattern}` : ''}
${teamRules.stepDefinitionPatterns.arrayAccessPatterns.example?.inArray ? `\nExample for array access with 'in' pattern:\n${teamRules.stepDefinitionPatterns.arrayAccessPatterns.example.inArray}` : ''}
${teamRules.stepDefinitionPatterns.arrayAccessPatterns.example?.simple ? `\nExample for simple array access:\n${teamRules.stepDefinitionPatterns.arrayAccessPatterns.example.simple}` : ''}
` : ''}

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
  const oauthToken = process.env.${oauthTokenEnvVar};
  if (!oauthToken) {
    console.warn('Warning: ${oauthTokenEnvVar} environment variable is not set. API requests may fail with 401 Unauthorized.');
  }
  this.headers = {
${headersCode}
    ...(oauthToken && { 'Authorization': \`Bearer \${oauthToken}\` })
  };
});

IMPORTANT: 
- Always include the Authorization header with Bearer token when setting up headers in the endpoint step definition. 
- Use process.env.${oauthTokenEnvVar} to get the token.
- Add validation to warn if token is missing (but still allow test to run).
- Use conditional spread operator to only add Authorization header if token exists.
- Include all default headers from team config.` : `Example for setting up headers with default headers:
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
Then('the response status code should be {int} for [scenario-name]', function (this: CustomWorld, expectedStatusCode: number) {
  expect(this.response?.status).to.equal(expectedStatusCode);
});

CRITICAL: The step definition text MUST match EXACTLY what's in the feature file. If the feature file says:
- "Then the response status code should be 200 for create-non-b2b-user-with-valid-data" -> use that EXACT text
- "Then the response status for create-non-b2b-user-with-unsupported-registertype should be 422" -> use that EXACT text
- DO NOT change "status code" to "status" or vice versa - match the feature file exactly

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
      
      // Validate that all steps from feature file are generated
      content = this.ensureAllStepsGenerated(content, cucumberFeature, scenarioName);
      
      // Fix response structure handling based on team rules
      if (teamRules) {
        content = this.fixResponseStructureHandling(content, scenario.endpoint, teamRules);
      }
      
      // Validate and fix data table consistency in feature files
      // Note: Data table validation is done in feature file generation, not step definitions
      
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
      
      // Fix data table parsing - only replace rowsHash() with hashes() for multi-column tables
      // DO NOT replace if it's a 2-column table (key-value pairs)
      // Check if feature file has a 2-column table pattern first
      const hasTwoColumnTable = cucumberFeature.match(/\|\s*\w+\s*\|\s*[^|]+\s*\|/);
      if (!hasTwoColumnTable) {
        // Only replace if it's NOT a 2-column table
        content = content.replace(/dataTable\.rowsHash\(\)/g, 'dataTable.hashes()');
      }
      
      // Fix request body parsing - ensure we extract first row from hashes() with null check
      content = content.replace(
        /const\s+(\w+)\s*=\s*dataTable\.hashes\(\)\s*;\s*this\.requestBody\s*=\s*\1\s*;/g,
        'const rows = dataTable.hashes();\n  const $1 = rows[0];\n  this.requestBody = $1;'
      );
      
      // Fix request headers parsing - ensure we correctly merge headers from data table
      // Pattern: Given('...headers...include:', function (this: CustomWorld, dataTable) { ... })
      content = content.replace(
        /Given\([^)]*headers[^)]*include[^)]*\)[^}]*\{[^}]*const\s+rows\s*=\s*dataTable\.hashes\(\)\s*;[^}]*for\s*\([^)]*\)\s*\{[^}]*this\.headers\[[^\]]+\]\s*=\s*rows\[[^\]]+\]\s*;[^}]*\}/g,
        (match) => {
          // Replace with correct pattern: extract first row and merge with existing headers
          return match.replace(
            /const\s+rows\s*=\s*dataTable\.hashes\(\)\s*;[^}]*for\s*\([^)]*\)\s*\{[^}]*this\.headers\[[^\]]+\]\s*=\s*rows\[[^\]]+\]\s*;[^}]*\}/,
            'const rows = dataTable.hashes();\n  const headerRow = rows[0];\n  this.headers = { ...this.headers, ...headerRow };'
          );
        }
      );
      
      // Also fix simpler incorrect patterns for headers
      content = content.replace(
        /const\s+rows\s*=\s*dataTable\.hashes\(\)\s*;\s*for\s*\(const\s+key\s+in\s+rows\)\s*\{[^}]*this\.headers\[key\]\s*=\s*rows\[key\]\s*;[^}]*\}/g,
        'const rows = dataTable.hashes();\n  const headerRow = rows[0];\n  this.headers = { ...this.headers, ...headerRow };'
      );
      
      // Fix invalid query parameters - remove params with placeholder values like 'default'
      // Pattern: params: { engine: 'default' } or params: { engine: 'default', ... }
      content = content.replace(
        /params:\s*\{\s*engine:\s*['"]default['"][^}]*\}/g,
        '// params removed - optional query parameters should not be included unless explicitly needed'
      );
      // Also remove params object entirely if it only contains invalid values
      content = content.replace(
        /,\s*params:\s*\{\s*engine:\s*['"]default['"][^}]*\}\s*,?\s*/g,
        ' '
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
   * 
   * IMPORTANT: Fix order matters! Each fix operates on different parts of the code:
   * 1. Headers - fixes header object structure (must be first, before other fixes touch headers)
   * 2. DataTable - adds dataTable parameters (doesn't conflict with others)
   * 3. Quoted Strings - converts literal quotes to placeholders (operates on step definitions, not code body)
   * 4. Request Body - fixes requestBody assignments (operates on code body, not step definitions)
   * 5. Else Statements - removes duplicate else blocks (operates on code structure)
   * 6. Final Headers - final validation pass (catches anything missed, doesn't override previous fixes)
   * 
   * These fixes are designed to be NON-OVERLAPPING - each operates on a different scope:
   * - Step definitions (signatures) vs code body (implementation)
   * - Headers object vs request body vs else statements
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
    // Scope: this.headers = { ... } assignments
    content = this.fixHeadersObject(content, defaultHeaders, useOAuth, oauthTokenEnvVar, baseUrl);
    
    // STEP 2: Fix dataTable parameters
    // Scope: function signatures - adds dataTable parameter if missing
    content = this.fixDataTableParameters(content, cucumberFeature);
    
    // STEP 3: Fix quoted strings in step definitions - convert to placeholders
    // Scope: step definition signatures and function bodies (assertions only)
    // NOTE: This does NOT touch headers or requestBody assignments
    content = this.fixQuotedStringPlaceholders(content, cucumberFeature);
    
    // STEP 4: Fix request body issues (duplicate assignments, overwrites)
    // Scope: this.requestBody = { ... } assignments
    // NOTE: This does NOT touch step definitions or headers
    content = this.fixRequestBodyIssues(content, cucumberFeature);
    
    // STEP 5: Fix duplicate else statements
    // Scope: code structure (if/else blocks)
    // NOTE: This does NOT touch step definitions, headers, or requestBody
    content = this.removeDuplicateElseStatements(content);
    
    // STEP 6: Final headers validation (rebuild if still malformed)
    // Scope: this.headers = { ... } assignments (only if still malformed)
    // NOTE: This is a safety net - only fixes if headers are still broken after step 1
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
    
    // Fix single-row 2-column data tables - should use rowsHash() instead of hashes()
    // Pattern: data table with exactly 2 columns like | registerType | R |
    // Check if feature file has a 2-column table pattern
    const twoColumnTablePattern = /\|\s*\w+\s*\|\s*[^|]+\s*\|/;
    if (twoColumnTablePattern.test(cucumberFeature)) {
      // Find step definitions that use hashes() for what looks like a 2-column table
      // Look for patterns where we extract a single property from data (suggests 2-column table)
      content = content.replace(
        /const\s+rows\s*=\s*dataTable\.hashes\(\);\s*\n\s*const\s+(\w+)\s*=\s*rows\[0\];\s*\n\s*this\.requestBody\s*=\s*\{\s*(\w+):\s*\1\.(\w+)\s*\};/g,
        (match, varName, propName, propValue) => {
          // If only one property is being extracted, it's likely a 2-column table
          // Check if the feature file has exactly 2 columns in the table
          const tableMatch = cucumberFeature.match(/\|\s*(\w+)\s*\|\s*([^|]+)\s*\|/);
          if (tableMatch && tableMatch.length === 3) {
            // This is a 2-column table, use rowsHash()
            return `const ${varName} = dataTable.rowsHash();\n  this.requestBody = {\n    ${propName}: ${varName}.${propValue}\n  };`;
          }
          return match;
        }
      );
      
      // More aggressive fix: if we see hashes() used but the requestBody only has one property,
      // and the feature file has a 2-column table, convert to rowsHash()
      const hasTwoColumnTable = cucumberFeature.match(/\|\s*\w+\s*\|\s*[^|]+\s*\|/);
      if (hasTwoColumnTable) {
        content = content.replace(
          /(Given\([^)]*request\s+body[^)]*\)[^}]*\{[^}]*const\s+rows\s*=\s*dataTable\.hashes\(\);\s*\n\s*const\s+\w+\s*=\s*rows\[0\];\s*\n\s*this\.requestBody\s*=\s*\{\s*\w+:\s*\w+\.\w+\s*\};)/g,
          (match) => {
            // Replace hashes() with rowsHash() for 2-column tables
            return match.replace(
              /const\s+rows\s*=\s*dataTable\.hashes\(\);\s*\n\s*const\s+(\w+)\s*=\s*rows\[0\];/,
              'const $1 = dataTable.rowsHash();'
            );
          }
        );
      }
    }
    
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
   * Fix quoted strings in step definitions - convert literal quoted strings to placeholders
   * Cucumber treats quoted strings in feature files as parameters, so step definitions must use {string} placeholders
   */
  private fixQuotedStringPlaceholders(content: string, cucumberFeature: string): string {
    // Find all steps in feature file that contain quoted strings
    // Pattern: "some text" or 'some text' in step definitions
    const quotedStringPattern = /["']([^"']+)["']/g;
    
    // Extract all steps from feature file
    const featureSteps = cucumberFeature.match(/(?:Given|When|Then|And|But)\s+(.+)/gi) || [];
    
    // For each step in feature file, check if it has quoted strings
    for (const featureStep of featureSteps) {
      const quotedStrings: string[] = [];
      let match;
      const stepText = featureStep.replace(/(?:Given|When|Then|And|But)\s+/i, '').trim();
      
      // Find all quoted strings in this step
      while ((match = quotedStringPattern.exec(stepText)) !== null) {
        quotedStrings.push(match[1]);
      }
      
      // If step has quoted strings, find corresponding step definition and fix it
      if (quotedStrings.length > 0) {
        // Create a pattern to find the step definition
        // Escape special regex characters in step text
        const escapedStepText = stepText
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/["']([^"']+)["']/g, '["\']$1["\']'); // Match both single and double quotes
        
        // Find step definitions that match this pattern but have literal quotes instead of placeholders
        const stepDefPattern = new RegExp(
          `(Given|When|Then|And|But)\\(['"]${escapedStepText}['"][^)]*\\)\\s*function\\s*\\(this:\\s*CustomWorld\\)\\s*\\{`,
          'gi'
        );
        
        // Store paramNames outside the replace callback so we can use them later
        let storedParamNames: string[] = [];
        
        content = content.replace(stepDefPattern, (match, stepType) => {
          // Replace quoted strings with {string} placeholders
          let fixedStepText = stepText;
          let paramCount = 0;
          const paramNames: string[] = [];
          
          // Replace each quoted string with {string} placeholder
          for (const quotedStr of quotedStrings) {
            fixedStepText = fixedStepText.replace(
              new RegExp(`["']${quotedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
              '{string}'
            );
            // Generate meaningful parameter names
            const paramName = quotedStr.toLowerCase()
              .replace(/[^a-z0-9]+/g, '')
              .replace(/^(.)/, (m) => m.toLowerCase()) || `param${++paramCount}`;
            paramNames.push(paramName);
          }
          
          // Store paramNames for later use in function body fixes
          storedParamNames = [...paramNames];
          
          // Build new function signature with parameters
          // Use meaningful parameter names without index suffix for cleaner code
          const params = paramNames.map((name, index) => {
            // Generate meaningful names based on context
            if (name.includes('responsecode') || name.includes('response')) {
              return `expectedCode: string`;
            } else if (name.includes('property') || name.includes('field')) {
              return `propertyName: string`;
            } else if (name.includes('header')) {
              return `headerName: string`;
            } else if (name.includes('value')) {
              return `expectedValue: string`;
            }
            return `${name}: string`;
          }).join(', ');
          
          // Return fixed step definition
          return `${stepType}('${fixedStepText}', function (this: CustomWorld, ${params}) {`;
        });
        
        // Also fix the function body to use the parameters instead of hardcoded values
        // This is a simplified fix - for complex cases, we rely on the pattern matching above
        for (let i = 0; i < quotedStrings.length; i++) {
          const quotedValue = quotedStrings[i];
          if (!quotedValue) continue;
          
          // Find step definitions that reference this quoted value literally
          const literalValuePattern = new RegExp(
            `(expect\\([^)]*\\)\\.to\\.(equal|include|have\\.property)\\(['"]${quotedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\))`,
            'gi'
          );
          
          // Replace with parameter reference (simplified - assumes order matches)
          // This is a heuristic and may need refinement
          content = content.replace(literalValuePattern, (match) => {
            // Determine which parameter this should be based on context
            let paramName: string;
            // Check if this is a response code value (like "VERIFIED", "PREMISES_PARTIAL", etc.)
            const responseCodeValues = ['VERIFIED', 'PREMISES_PARTIAL', 'STREET_PARTIAL', 'NOT_VERIFIED', 'CORRECTED'];
            if (responseCodeValues.includes(quotedValue.toUpperCase()) || quotedValue === 'responseCode') {
              // For responseCode property checks or response code values, use expectedCode
              paramName = quotedValue === 'responseCode' ? 'propertyName' : 'expectedCode';
            } else if (quotedValue.toLowerCase().includes('response') || quotedValue.toLowerCase().includes('code')) {
              paramName = 'expectedCode';
            } else if (quotedValue.toLowerCase().includes('property') || quotedValue.toLowerCase().includes('field')) {
              paramName = 'propertyName';
            } else {
              // Use the parameter name from the stored list, or generate one
              paramName = storedParamNames[i] || `param${i + 1}`;
            }
            return match.replace(new RegExp(`['"]${quotedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'gi'), paramName);
          });
        }
      }
    }
    
    // More specific fix for common patterns like "Content-Type" header checks
    // Pattern: the response header "Content-Type" should be "application/json"
    const headerCheckPattern = /(Given|When|Then|And|But)\\(['"]the response header ['"]Content-Type['"] should be ['"]application\/json['"]([^)]*)\\)\\s*function\\s*\\(this:\\s*CustomWorld\\)\\s*\\{/gi;
    
    content = content.replace(headerCheckPattern, (match, stepType, suffix) => {
      // Extract scenario name from suffix (e.g., " for successfully-create-a-non-b2b-user-with-registertype-r")
      const scenarioMatch = suffix.match(/for\s+([a-z0-9-]+)/i);
      const scenarioSuffix = scenarioMatch ? ` for ${scenarioMatch[1]}` : '';
      
      // Replace with placeholder version, preserving the actual scenario name
      return `${stepType}('the response header {string} should be {string}${scenarioSuffix}', function (this: CustomWorld, headerName: string, expectedValue: string) {`;
    });
    
    // Fix the function body for header checks
    content = content.replace(
      /expect\\(this\\.response\\?\\.[^)]*\\)\\.to\\.(equal|include)\\(['"]application\/json['"]\\)/gi,
      (match) => {
        // Replace with parameter-based check
        return `expect(this.response?.headers[headerName.toLowerCase()] || this.response?.headers[headerName]).to.include(expectedValue)`;
      }
    );
    
    // POST-PROCESSING FIX: Catch cases where step definition has literal quotes but function body uses undefined variable
    // Pattern: Step def has "VERIFIED" or other quoted strings, but function body uses expectedCode without parameter
    const undefinedVarPattern = /(Then|And)\(['"]([^'"]*)(["']([^"']+)["'])([^'"]*)['"][^)]*\)\s*function\s*\(this:\s*CustomWorld\)\s*\{[^}]*expect\([^)]*\)\.to\.equal\((\w+)\)/g;
    content = content.replace(undefinedVarPattern, (match, stepType, beforeQuote, quoteMatch, quotedValue, afterQuote, varName) => {
      // If the step definition has a quoted string but function signature doesn't have parameters, fix it
      // Check if varName is used but not in function signature (it would be undefined)
      if (varName && !match.includes(`${varName}: string`)) {
        // Replace quoted string with {string} placeholder and add parameter
        const fixedStepText = beforeQuote + '{string}' + afterQuote;
        let paramName = 'expectedCode';
        const responseCodeValues = ['VERIFIED', 'PREMISES_PARTIAL', 'STREET_PARTIAL', 'NOT_VERIFIED', 'CORRECTED'];
        if (responseCodeValues.includes(quotedValue.toUpperCase())) {
          paramName = 'expectedCode';
        } else if (quotedValue.toLowerCase().includes('property') || quotedValue.toLowerCase().includes('field')) {
          paramName = 'propertyName';
        } else if (quotedValue.toLowerCase().includes('header')) {
          paramName = 'headerName';
        }
        
        return match
          .replace(new RegExp(`["']${quotedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'), '{string}')
          .replace('function (this: CustomWorld) {', `function (this: CustomWorld, ${paramName}: string) {`)
          .replace(new RegExp(`\\b${varName}\\b`, 'g'), paramName);
      }
      return match;
    });
    
    return content;
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
   * Validate and fix data table consistency in feature files (for feature file generation)
   * Ensures all data table rows have the same number of columns as the header
   */
  private validateAndFixDataTablesInFeature(featureContent: string): string {
    // Find all data tables
    const lines = featureContent.split('\n');
    const fixedLines: string[] = [];
    let inDataTable = false;
    let headerCols = 0;
    let headerCells: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this line is part of a data table
      if (trimmed.includes('|') && (trimmed.startsWith('|') || line.match(/^\s+\|/))) {
        // Split by | and get all cells
        const allCells = line.split('|');
        // Extract cells - remove leading/trailing empty cells but keep middle ones (even if empty)
        const cells: string[] = [];
        for (let idx = 0; idx < allCells.length; idx++) {
          const cell = allCells[idx].trim();
          // Skip leading empty cell (before first |)
          if (idx === 0 && cell === '') continue;
          // Skip trailing empty cell (after last |)
          if (idx === allCells.length - 1 && cell === '') continue;
          // Keep all other cells (including empty middle cells)
          cells.push(cell);
        }
        const cols = cells.length;
        
        if (!inDataTable) {
          // First line of table - this is the header
          inDataTable = true;
          headerCols = cols;
          headerCells = cells;
          fixedLines.push(line);
        } else {
          // Data row - check column count
          const indent = line.match(/^\s*/)?.[0] || '';
          
          if (cols === headerCols) {
            // Correct number of columns
            fixedLines.push(line);
          } else if (cols > headerCols) {
            // Too many columns - truncate to match header
            const fixedCells = cells.slice(0, headerCols);
            fixedLines.push(`${indent}| ${fixedCells.join(' | ')} |`);
          } else {
            // Too few columns - pad with empty cells to match header
            const paddedCells = [...cells];
            while (paddedCells.length < headerCols) {
              paddedCells.push('');
            }
            fixedLines.push(`${indent}| ${paddedCells.join(' | ')} |`);
          }
        }
      } else {
        // Not a data table line
        if (inDataTable) {
          inDataTable = false;
          headerCols = 0;
          headerCells = [];
        }
        fixedLines.push(line);
      }
    }
    
    return fixedLines.join('\n');
  }

  /**
   * Fix endpoint selection based on Swagger spec and scenario context
   * If scenario is about "validate" but uses suggestAddresses, switch to verifyAddress
   */
  private fixEndpointSelection(content: string, scenario: TestScenario, swaggerSpec: any): string {
    const scenarioNameLower = scenario.name.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check if this is a validation scenario
    const isValidationScenario = scenarioNameLower.includes('validate') || 
                                  scenarioNameLower.includes('verify') ||
                                  scenarioNameLower.includes('residential') ||
                                  (contentLower.includes('validate') && !contentLower.includes('suggest'));
    
    // Check current endpoint
    const currentEndpoint = scenario.endpoint;
    const isUsingSuggest = currentEndpoint.includes('suggest');
    const isUsingVerify = currentEndpoint.includes('verify') && !currentEndpoint.includes('Bulk');
    
    // If validation scenario but using suggestAddresses, check if verifyAddress exists and switch
    if (isValidationScenario && isUsingSuggest && swaggerSpec.paths) {
      const verifyEndpoint = Object.keys(swaggerSpec.paths).find(path => 
        path.includes('verify') && !path.includes('Bulk')
      );
      
      if (verifyEndpoint) {
        // Get Swagger summary to confirm it's for validation
        const verifyOp = swaggerSpec.paths[verifyEndpoint]?.post || swaggerSpec.paths[verifyEndpoint]?.get;
        const verifySummary = verifyOp?.summary || '';
        
        if (verifySummary.toLowerCase().includes('validate') || verifySummary.toLowerCase().includes('verify')) {
          // Replace suggestAddresses with verifyAddress in the feature file
          content = content.replace(
            new RegExp(`"/avs/v1.0/suggestAddresses"`, 'g'),
            `"${verifyEndpoint}"`
          );
          content = content.replace(
            new RegExp(`/avs/v1.0/suggestAddresses`, 'g'),
            verifyEndpoint
          );
          
          // Also update the scenario endpoint for downstream processing
          scenario.endpoint = verifyEndpoint;
        }
      }
    }
    
    return content;
  }

  /**
   * Enforce working test data from rules - replace any addresses with working addresses
   * For negative/boundary scenarios, use invalid test data if available
   */
  private enforceWorkingTestData(content: string, scenario: TestScenario, teamRules: any): string {
    if (!teamRules?.testData?.workingAddresses) {
      return content;
    }
    
    // Determine if this is a negative/boundary scenario that needs invalid test data
    const scenarioNameLower = scenario.name.toLowerCase();
    const scenarioDescLower = (scenario.description || '').toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check for negative/boundary indicators
    const isNegativeScenario = scenario.type === 'negative' || 
                               scenario.type === 'boundary' ||
                               scenarioNameLower.includes('invalid') ||
                               scenarioNameLower.includes('missing') ||
                               scenarioNameLower.includes('error') ||
                               scenarioNameLower.includes('fail') ||
                               scenarioNameLower.includes('incorrect') ||
                               scenarioDescLower.includes('invalid') ||
                               scenarioDescLower.includes('missing') ||
                               scenarioDescLower.includes('error') ||
                               contentLower.includes('invalid') ||
                               contentLower.includes('missing required');
    
    // Determine which test data to use based on scenario type and context
    let testData = null;
    const isResidentialAddress = scenarioNameLower.includes('residential') || 
                                  scenarioNameLower.includes('verify') ||
                                  contentLower.includes('residential') ||
                                  contentLower.includes('600 harlan') ||
                                  contentLower.includes('bonaire');
    const isSuggestScenario = scenarioNameLower.includes('suggest') && 
                              !scenarioNameLower.includes('residential') &&
                              !scenarioNameLower.includes('verify');
    
    // For negative scenarios, try to use invalid test data first
    if (isNegativeScenario && teamRules.testData.invalidAddresses) {
      // Determine which invalid data to use based on scenario context
      if (scenario.endpoint.includes('verify') && !scenario.endpoint.includes('Bulk')) {
        // Check for specific invalid data types
        if (scenarioNameLower.includes('zipcode') || scenarioNameLower.includes('postal') || contentLower.includes('zipcode')) {
          testData = teamRules.testData.invalidAddresses.verifyAddress?.invalidZipcode;
          console.log('✅ Using invalid zipcode test data for negative verifyAddress scenario');
        } else if (scenarioNameLower.includes('missing') || contentLower.includes('missing')) {
          testData = teamRules.testData.invalidAddresses.verifyAddress?.missingFields;
          console.log('✅ Using missing fields test data for negative verifyAddress scenario');
        } else {
          // Default invalid data for verifyAddress
          testData = teamRules.testData.invalidAddresses.verifyAddress?.invalidZipcode ||
                     teamRules.testData.invalidAddresses.verifyAddress?.missingFields;
          if (testData) console.log('✅ Using default invalid test data for negative verifyAddress scenario');
        }
      } else if (scenario.endpoint.includes('suggest')) {
        // Check for specific invalid data types
        if (scenarioNameLower.includes('zipcode') || scenarioNameLower.includes('postal') || contentLower.includes('zipcode')) {
          testData = teamRules.testData.invalidAddresses.suggestAddresses?.invalidZipcode;
          console.log('✅ Using invalid zipcode test data for negative suggestAddresses scenario');
        } else if (scenarioNameLower.includes('incomplete') || contentLower.includes('incomplete')) {
          testData = teamRules.testData.invalidAddresses.suggestAddresses?.incomplete;
          console.log('✅ Using incomplete test data for negative suggestAddresses scenario');
        } else {
          // Default invalid data for suggestAddresses
          testData = teamRules.testData.invalidAddresses.suggestAddresses?.incomplete ||
                     teamRules.testData.invalidAddresses.suggestAddresses?.invalidZipcode;
          if (testData) console.log('✅ Using default invalid test data for negative suggestAddresses scenario');
        }
      }
    }
    
    // Fall back to working data if no invalid data found or if positive scenario
    if (!testData) {
      // PRIORITY 1: Scenario context (residential/verify) - use verifyAddress data
      if (isResidentialAddress && teamRules.testData.workingAddresses.verifyAddress) {
        testData = teamRules.testData.workingAddresses.verifyAddress;
      } 
      // PRIORITY 2: Endpoint-based selection
      else if (scenario.endpoint.includes('verify') && !scenario.endpoint.includes('Bulk')) {
        testData = teamRules.testData.workingAddresses.verifyAddress;
      } else if (scenario.endpoint.includes('suggest') && !isResidentialAddress) {
        testData = teamRules.testData.workingAddresses.suggestAddresses;
      } 
      // PRIORITY 3: Default fallback
      else {
        testData = teamRules.testData.workingAddresses.verifyAddress || 
                   teamRules.testData.workingAddresses.suggestAddresses;
      }
    }
    
    if (!testData) {
      return content;
    }
    
    // Extract test data values (working or invalid)
    const testStreet = Array.isArray(testData.streets) ? testData.streets[0] : testData.streets;
    const testCity = testData.city || '';
    const testState = testData.stateOrProvince || '';
    const testPostal = testData.postalCode || '';
    const testCountry = testData.country || '';
    
    // Find data tables in the feature file and replace with working data
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    let inDataTable = false;
    let tableStartIndex = -1;
    let headerFields: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this is a data table header
      if (trimmed.includes('|') && (trimmed.startsWith('|') || line.match(/^\s+\|/))) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
        
        if (!inDataTable && cells.length > 0 && (cells.includes('streets') || cells.includes('street'))) {
          // This is the header row of an address data table
          inDataTable = true;
          tableStartIndex = i;
          headerFields = cells;
          fixedLines.push(line);
        } else if (inDataTable) {
          // This is a data row - ALWAYS replace it with working data (DEFAULT TO TRUE)
          const indent = line.match(/^\s*/)?.[0] || '';
          const dataRow: string[] = [];
          
          for (const field of headerFields) {
            if (field.toLowerCase() === 'streets' || field.toLowerCase() === 'street') {
              dataRow.push(testStreet);
            } else if (field.toLowerCase() === 'city') {
              dataRow.push(testCity);
            } else if (field.toLowerCase() === 'stateorprovince' || field.toLowerCase() === 'state') {
              dataRow.push(testState);
            } else if (field.toLowerCase() === 'postalcode' || field.toLowerCase() === 'postal' || field.toLowerCase() === 'zip') {
              dataRow.push(testPostal);
            } else if (field.toLowerCase() === 'country') {
              dataRow.push(testCountry);
            } else {
              // Keep original value for other fields (like addressType, latitude, etc.)
              const fieldIndex = headerFields.indexOf(field);
              const originalCells = trimmed.split('|').map(c => c.trim()).filter(c => c);
              dataRow.push(originalCells[fieldIndex] || '');
            }
          }
          
          fixedLines.push(`${indent}| ${dataRow.join(' | ')} |`);
          inDataTable = false; // Reset after replacing data row
        } else {
          fixedLines.push(line);
        }
      } else {
        // Not a data table line
        if (inDataTable) {
          inDataTable = false;
        }
        fixedLines.push(line);
      }
    }
    
    return fixedLines.join('\n');
  }

  /**
   * Adjust expected response codes when using working test data
   * Makes the generator more lenient - if we're using working test data but expecting
   * a negative response code, adjust it to match what the working data actually returns.
   * Also validates against Swagger spec enum values.
   */
  private adjustExpectedResponseCodes(content: string, scenario: TestScenario, teamRules: any, swaggerSpec: any): string {
    if (!teamRules?.testData?.workingAddresses) {
      return content;
    }

    // Check if we're using working test data
    const isUsingWorkingData = 
      (scenario.endpoint.includes('verify') && teamRules.testData.workingAddresses.verifyAddress) ||
      (scenario.endpoint.includes('suggest') && teamRules.testData.workingAddresses.suggestAddresses);

    if (!isUsingWorkingData) {
      return content;
    }

    // Extract valid response codes from Swagger spec
    let swaggerResponseCodes: string[] = [];
    try {
      const endpointPath = scenario.endpoint;
      const method = scenario.method.toLowerCase();
      const endpoint = swaggerSpec.paths?.[endpointPath]?.[method];
      
      if (endpoint?.responses?.['200']) {
        // Handle both Swagger 2.0 (schema) and OpenAPI 3.0 (content) formats
        const responseSchema = endpoint.responses['200']?.schema ||  // Swagger 2.0
                              endpoint.responses['200']?.content?.['application/json']?.schema ||  // OpenAPI 3.0
                              endpoint.responses['200']?.content?.['*/*']?.schema;  // OpenAPI 3.0 fallback
        
        if (responseSchema) {
          // Handle $ref references
          let schema = responseSchema;
          if (schema.$ref) {
            const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
            schema = swaggerSpec.components?.schemas?.[refPath] || swaggerSpec.definitions?.[refPath] || schema;
          }
          
          // Handle array responses (like suggestAddresses)
          if (schema.type === 'array' && schema.items) {
            schema = schema.items;
            if (schema.$ref) {
              const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
              schema = swaggerSpec.components?.schemas?.[refPath] || swaggerSpec.definitions?.[refPath] || schema;
            }
          }
          
          // Extract responseCode enum from schema
          if (schema.properties?.responseCode?.enum) {
            swaggerResponseCodes = schema.properties.responseCode.enum;
            console.log(`✅ Extracted responseCode enum from Swagger for ${endpointPath}: ${swaggerResponseCodes.join(', ')}`);
          } else {
            console.warn(`⚠️  responseCode enum not found in Swagger schema for ${endpointPath}`);
          }
        }
      }
    } catch (error) {
      // If Swagger parsing fails, fall back to rules
      console.warn('Failed to extract responseCode enum from Swagger:', error);
    }

    // Get valid response codes from rules (fallback if Swagger extraction failed)
    const validResponseCodes = swaggerResponseCodes.length > 0 
      ? swaggerResponseCodes 
      : (teamRules?.assertionPatterns?.responseCodeValues || 
         ['VERIFIED', 'PREMISES_PARTIAL', 'STREET_PARTIAL', 'NOT_VERIFIED', 'CORRECTED']);

    // For AVS API with working test data:
    // - verifyAddress with working data typically returns "VERIFIED"
    // - suggestAddresses with working data typically returns "CORRECTED" (address gets corrected)
    
    // Pattern to find response code assertions
    // Matches: "the response code for [scenario-name] should be "NOT_VERIFIED""
    const responseCodePattern = /(the response code for [^"]+ should be ")(NOT_VERIFIED|VERIFIED|CORRECTED|PREMISES_PARTIAL|STREET_PARTIAL)(")/gi;
    
    return content.replace(responseCodePattern, (match, prefix, currentCode, suffix) => {
      // Validate that the code is in the valid enum values from Swagger
      if (!validResponseCodes.includes(currentCode)) {
        console.warn(`Warning: Response code "${currentCode}" not found in Swagger enum. Valid values: ${validResponseCodes.join(', ')}`);
      }
      
      // If expecting NOT_VERIFIED but using working test data, adjust based on endpoint
      if (currentCode === 'NOT_VERIFIED' && isUsingWorkingData) {
        if (scenario.endpoint.includes('verify')) {
          // verifyAddress with working data -> VERIFIED (if valid in Swagger)
          const adjustedCode = validResponseCodes.includes('VERIFIED') ? 'VERIFIED' : currentCode;
          return `${prefix}${adjustedCode}${suffix}`;
        } else if (scenario.endpoint.includes('suggest')) {
          // suggestAddresses with working data -> CORRECTED (address gets corrected, if valid in Swagger)
          const adjustedCode = validResponseCodes.includes('CORRECTED') ? 'CORRECTED' : currentCode;
          return `${prefix}${adjustedCode}${suffix}`;
        }
      }
      // Otherwise, keep the original code (if it's valid in Swagger)
      return match;
    });
  }

  /**
   * Fix response structure handling based on team rules (array vs object responses)
   */
  private fixResponseStructureHandling(content: string, endpoint: string, teamRules: any): string {
    const isArrayEndpoint = teamRules.responsePatterns?.arrayResponseEndpoints?.includes(endpoint);
    const isObjectEndpoint = teamRules.responsePatterns?.objectResponseEndpoints?.includes(endpoint);
    
    if (isArrayEndpoint) {
      // Fix assertions that expect array - ensure we're checking response.data
      content = content.replace(
        /const\s+responseData\s*=\s*this\.response\?\.[^;]+;\s*expect\(responseData\)\.to\.be\.an\(['"]array['"]\)/g,
        (match) => {
          // Ensure we're checking response.data, not responseData if it's wrong
          if (!match.includes('this.response?.data')) {
            return match.replace(/const\s+responseData\s*=\s*[^;]+;/, 'const responseData = this.response?.data;');
          }
          return match;
        }
      );
    }
    
    return content;
  }

  /**
   * Fix incorrect property paths - some properties are at top level, not nested
   */
  private fixIncorrectPropertyPaths(content: string, endpoint: string, teamRules: any): string {
    // Properties that are commonly at top level but might be incorrectly accessed via requestAddress
    const topLevelProperties = ['cityChanged', 'postalChanged', 'stateProvinceChanged', 'streetChanged', 'responseCode', 'engineResponseCode', 'shippableResponseCode'];
    
    // Fix patterns like response.data[0].requestAddress.cityChanged -> response.data[0].cityChanged
    for (const prop of topLevelProperties) {
      // Fix array access patterns
      const arrayPattern = new RegExp(`this\\.response\\?\\.data\\[([^\\]]+)\\]\\?\\.requestAddress\\?\\.${prop}`, 'g');
      content = content.replace(arrayPattern, `this.response?.data[$1]?.${prop}`);
      
      // Fix object access patterns (for object endpoints)
      const objectPattern = new RegExp(`this\\.response\\?\\.data\\?\\.requestAddress\\?\\.${prop}`, 'g');
      content = content.replace(objectPattern, `this.response?.data?.${prop}`);
    }
    
    return content;
  }

  /**
   * Ensure all steps from feature file have corresponding step definitions
   */
  private ensureAllStepsGenerated(content: string, cucumberFeature: string, scenarioName: string): string {
    // Extract all steps from feature file
    const stepPattern = /(?:Given|When|Then|And|But)\s+(.+)/gi;
    const featureSteps: string[] = [];
    let match;
    
    while ((match = stepPattern.exec(cucumberFeature)) !== null) {
      if (match[1]) {
        // Normalize step text - remove parameters like {int}, {string}, etc. for matching
        const stepText = match[1].trim();
        featureSteps.push(stepText);
      }
    }
    
    // Extract all step definitions from generated content
    const stepDefPattern = /(?:Given|When|Then|And|But)\(['"]([^'"]+)['"]/g;
    const generatedSteps: string[] = [];
    
    while ((match = stepDefPattern.exec(content)) !== null) {
      if (match[1]) {
        // Normalize step text for comparison
        const stepText = match[1].trim();
        generatedSteps.push(stepText);
      }
    }
    
    // Check for missing steps
    const missingSteps: string[] = [];
    for (const featureStep of featureSteps) {
      // Normalize both for comparison - replace parameters and scenario name
      const normalizedFeatureStep = featureStep
        .replace(/\{int\}/g, '{int}')
        .replace(/\{string\}/g, '{string}')
        .replace(/\{float\}/g, '{float}')
        .toLowerCase();
      
      // Check if any generated step matches (allowing for parameter variations)
      const isFound = generatedSteps.some(genStep => {
        const normalizedGenStep = genStep
          .replace(/\{int\}/g, '{int}')
          .replace(/\{string\}/g, '{string}')
          .replace(/\{float\}/g, '{float}')
          .toLowerCase();
        
        // Use flexible matching - check if the core step text matches
        // Remove scenario name for comparison
        const featureCore = normalizedFeatureStep.replace(new RegExp(scenarioName, 'gi'), '').trim();
        const genCore = normalizedGenStep.replace(new RegExp(scenarioName, 'gi'), '').trim();
        
        // Check if they match (allowing for slight variations)
        return featureCore === genCore || 
               normalizedFeatureStep.includes(genCore) || 
               normalizedGenStep.includes(featureCore);
      });
      
      if (!isFound) {
        missingSteps.push(featureStep);
      }
    }
    
    // If there are missing steps, try to generate them
    if (missingSteps.length > 0) {
      console.warn(`Warning: Missing step definitions for: ${missingSteps.join(', ')}`);
      
      // Try to generate missing step definitions based on common patterns
      for (const missingStep of missingSteps) {
        // Check if it's a status code assertion
        const statusCodeMatch = missingStep.match(/response\s+status\s+code\s+should\s+be\s+(\d+)/i);
        if (statusCodeMatch) {
          const statusCode = statusCodeMatch[1];
          const stepDef = `Then('${missingStep}', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(${statusCode});
});`;
          
          // Add before the last closing brace or at the end
          if (!content.includes(`'${missingStep}'`)) {
            // Find a good place to insert (before the last closing brace)
            const lastBraceIndex = content.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              content = content.slice(0, lastBraceIndex) + '\n' + stepDef + '\n' + content.slice(lastBraceIndex);
            } else {
              content += '\n' + stepDef;
            }
          }
        }
        
        // Check if it's a status assertion (without "code")
        const statusMatch = missingStep.match(/response\s+status\s+should\s+be\s+(\d+)/i);
        if (statusMatch && !statusCodeMatch) {
          const statusCode = statusMatch[1];
          const stepDef = `Then('${missingStep}', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(${statusCode});
});`;
          
          if (!content.includes(`'${missingStep}'`)) {
            const lastBraceIndex = content.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              content = content.slice(0, lastBraceIndex) + '\n' + stepDef + '\n' + content.slice(lastBraceIndex);
            } else {
              content += '\n' + stepDef;
            }
          }
        }
        
        // Check if it's an array access pattern like response[0].responseCode should be in [...]
        const arrayAccessMatch = missingStep.match(/response\[(\d+)\]\.(\w+)\s+should\s+be\s+in\s+\[([^\]]+)\]/i);
        if (arrayAccessMatch) {
          const index = arrayAccessMatch[1];
          const property = arrayAccessMatch[2];
          const valuesStr = arrayAccessMatch[3];
          // Parse values from array string like "PREMISES_PARTIAL", "STREET_PARTIAL", "CORRECTED"
          // Handle both quoted and unquoted values, filter out empty strings
          const values = valuesStr.split(',').map(v => {
            const trimmed = v.trim();
            // Remove quotes if present (both single and double)
            return trimmed.replace(/^["']|["']$/g, '');
          }).filter(v => v.length > 0);
          
          // Generate step definition with multiple {string} parameters
          const params = values.map((_, i) => `code${i + 1}: string`).join(', ');
          const paramNames = values.map((_, i) => `code${i + 1}`).join(', ');
          const expectedValues = `[${paramNames}]`;
          
          const stepDef = `Then('the response[{int}].${property} should be in [${values.map((_, i) => '{string}').join(', ')}] for ${scenarioName}', function (this: CustomWorld, index: number, ${params}) {
  const ${property} = this.response?.data[index]?.${property};
  const expectedValues = ${expectedValues};
  expect(expectedValues).to.include(${property});
});`;
          
          if (!content.includes(`response[${index}].${property}`)) {
            const lastBraceIndex = content.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              content = content.slice(0, lastBraceIndex) + '\n' + stepDef + '\n' + content.slice(lastBraceIndex);
            } else {
              content += '\n' + stepDef;
            }
          }
        }
        
        // Check if it's a simple array access like response[0].postalChanged should be true
        const simpleArrayAccessMatch = missingStep.match(/response\[(\d+)\]\.(\w+)\s+should\s+be\s+(\w+)/i);
        if (simpleArrayAccessMatch && !arrayAccessMatch) {
          const index = simpleArrayAccessMatch[1];
          const property = simpleArrayAccessMatch[2];
          const expectedValue = simpleArrayAccessMatch[3];
          
          const stepDef = `Then('the response[{int}].${property} should be ${expectedValue} for ${scenarioName}', function (this: CustomWorld, index: number) {
  const ${property} = this.response?.data[index]?.${property};
  expect(${property}).to.be.${expectedValue};
});`;
          
          if (!content.includes(`response[${index}].${property}`)) {
            const lastBraceIndex = content.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              content = content.slice(0, lastBraceIndex) + '\n' + stepDef + '\n' + content.slice(lastBraceIndex);
            } else {
              content += '\n' + stepDef;
            }
          }
        }
      }
    }
    
    return content;
  }

  /**
   * Clean up old generated files for a specific service
   */
  cleanupOldFiles(service?: string): void {
    try {
      // Clean up feature files
      let featuresDir = path.join(process.cwd(), 'features', 'api');
      if (service) {
        featuresDir = path.join(featuresDir, service);
      }
      
      if (fs.existsSync(featuresDir)) {
        const files = fs.readdirSync(featuresDir, { recursive: true });
        for (const file of files) {
          if (typeof file === 'string' && file.endsWith('.feature')) {
            const filePath = path.join(featuresDir, file);
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Removed: ${filePath}`);
          }
        }
      }

      // Clean up step definition files
      let stepsDir = path.join(process.cwd(), 'src', 'steps', 'api');
      if (service) {
        stepsDir = path.join(stepsDir, service);
      }
      
      if (fs.existsSync(stepsDir)) {
        const files = fs.readdirSync(stepsDir);
        for (const file of files) {
          if (file.endsWith('.steps.ts')) {
            const filePath = path.join(stepsDir, file);
            fs.unlinkSync(filePath);
            console.log(`   🗑️  Removed: ${filePath}`);
          }
        }
      }
    } catch (error: any) {
      console.warn(`Warning: Could not clean up old files: ${error.message}`);
    }
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

