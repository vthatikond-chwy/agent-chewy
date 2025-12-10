/**
 * Simple API test generator using OpenAI
 */
import OpenAI from 'openai';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
export class SimpleTestGenerator {
    openai;
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY
        });
    }
    /**
     * Generate test scenarios from natural language
     */
    async generateTestScenarios(naturalLanguageInput, swaggerSpec, targetEndpoints) {
        // Filter endpoints if specified
        let endpoints = [];
        const paths = swaggerSpec.paths || {};
        for (const [path, pathItem] of Object.entries(paths)) {
            if (!targetEndpoints || targetEndpoints.includes(path)) {
                for (const [method, operation] of Object.entries(pathItem)) {
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
        }
        catch (error) {
            throw new Error(`Failed to generate test scenarios: ${error.message}`);
        }
    }
    /**
     * Generate Cucumber feature file from scenario
     */
    async generateCucumberFeature(scenario, swaggerSpec) {
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
        }
        catch (error) {
            throw new Error(`Failed to generate Cucumber feature: ${error.message}`);
        }
    }
    /**
     * Generate TypeScript step definitions
     */
    async generateStepDefinitions(cucumberFeature, scenario, swaggerSpec) {
        const systemPrompt = `You are an expert in API test automation with TypeScript and Cucumber.
Generate production-ready step definitions with proper error handling and assertions.
Return ONLY the TypeScript code, properly formatted. Do NOT include markdown code blocks.`;
        const scenarioName = scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const userPrompt = `Generate TypeScript step definitions for this Cucumber feature:

Feature File:
${cucumberFeature}

API Details:
- Base URL: ${this.getBaseUrl(swaggerSpec)}
- Endpoint: ${scenario.method} ${scenario.endpoint}
- Expected Status: ${scenario.expectedStatus}
- Scenario Name: ${scenario.name}
- Scenario ID: ${scenarioName}

CRITICAL REQUIREMENTS:
1. Use @cucumber/cucumber (Given, When, Then, World)
2. Use axios for HTTP requests with CORRECT import syntax:
   - import axios from 'axios';
   - import type { AxiosResponse } from 'axios';
   - DO NOT use: import axios, { AxiosResponse } from 'axios';
3. Use chai for assertions: import { expect } from 'chai';
4. Define CustomWorld interface extending World - DO NOT import from external files
5. Store request/response in World context (this.response, this.requestBody, etc.)
6. Always set baseUrl to 'https://avs.scff.stg.chewy.com' in the step definition that sets the endpoint
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
8. Use staging endpoint: https://avs.scff.stg.chewy.com (for AVS API)
9. Handle errors properly with try/catch
10. Add TypeScript types for World interface
11. Include proper headers (Content-Type: application/json)
12. For AVS API responses, use 'responseCode' field (not 'verificationStatus')
13. DO NOT generate common steps like "the response status code should be {int}" - these are in common.steps.ts

Example for multi-column data table with address:
Given('I set the request body with the following address details for [scenario-name]', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes(); // Returns array of objects
  const addressData = rows[0]; // Use first row
  // Convert streets to array format as required by AVS API
  this.requestBody = {
    city: addressData.city,
    country: addressData.country || 'US',
    postalCode: addressData.postalCode,
    stateOrProvince: addressData.stateOrProvince,
    streets: [addressData.streets], // Convert to array
  };
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

IMPORTANT: Always handle errors properly - set this.response = error.response when axios errors occur, so assertions can check response.status even for error responses.

REQUIRED World interface (include this in every file):
import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

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

Example for response validation (AVS API):
Then('the response should contain the responseCode {string} for [scenario-name]', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Example for multiple response codes:
Then('the response body for [scenario-name] test contains one of the responseCodes {string}, {string}', function (this: CustomWorld, code1: string, code2: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect([code1, code2]).to.include(responseBody.responseCode);
});

Example for case-insensitive address comparison (API may return uppercase):
Then('the validatedAddress in the response matches the input address for [scenario-name] test', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  const inputAddress = this.requestBody;
  // Handle case-insensitive comparison for city (API may return uppercase)
  expect(responseBody.validatedAddress.city.toUpperCase()).to.equal(inputAddress.city.toUpperCase());
  expect(responseBody.validatedAddress.country).to.equal(inputAddress.country);
  expect(responseBody.validatedAddress.postalCode).to.equal(inputAddress.postalCode);
  expect(responseBody.validatedAddress.stateOrProvince).to.equal(inputAddress.stateOrProvince);
  expect(responseBody.validatedAddress.streets).to.deep.equal(inputAddress.streets);
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
            // Fix axios imports - ensure correct syntax (separate imports)
            content = content.replace(/import\s+axios\s*,\s*\{\s*AxiosResponse\s*\}\s*from\s*['"]axios['"]/g, "import axios from 'axios';\nimport type { AxiosResponse } from 'axios'");
            content = content.replace(/import\s+axios\s*,\s*\{\s*AxiosError\s*\}\s*from\s*['"]axios['"]/g, "import axios from 'axios';\nimport type { AxiosResponse } from 'axios'");
            // Remove duplicate import lines
            const lines = content.split('\n');
            const seenImports = new Set();
            const cleanedLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith('import')) {
                    const importKey = line.trim().replace(/\s+/g, ' ');
                    if (!seenImports.has(importKey)) {
                        seenImports.add(importKey);
                        cleanedLines.push(line);
                    }
                }
                else {
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
        }
        catch (error) {
            throw new Error(`Failed to generate step definitions: ${error.message}`);
        }
    }
    /**
     * Write feature file to disk
     */
    writeFeatureFile(scenario, content) {
        const featuresDir = path.join(process.cwd(), 'features', 'api');
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
    writeStepDefinitionFile(scenario, content) {
        const stepsDir = path.join(process.cwd(), 'src', 'steps', 'api');
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
     */
    getBaseUrl(spec) {
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
    sanitizeFilename(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
//# sourceMappingURL=simple-generator.js.map