/**
 * Context-Aware API Test Generator
 * 
 * Generates tests using:
 * - Context library (test patterns, business rules)
 * - Swagger/OpenAPI schema
 * - NLP input from user
 * 
 * Writes files to correct team-specific directories.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ContextLoader } from '../agents/api-agent/context/context-loader.js';
import type { ApiContext, TestDataPattern } from '../agents/api-agent/context/types.js';

dotenv.config();

export interface GeneratedScenario {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'boundary' | 'security';
  priority: 'high' | 'medium' | 'low';
  endpoint: string;
  method: string;
  testData: any;
  expectedResponseCode: string;
  expectedHttpStatus: number;
  assertions: string[];
  tags: string[];
}

export interface GenerationResult {
  scenarios: GeneratedScenario[];
  featureFiles: string[];
  stepDefinitionFiles: string[];
}

export class ContextAwareGenerator {
  private openai: OpenAI;
  private context: ApiContext | null = null;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate tests from NLP input with context
   */
  async generate(options: {
    nlpInput: string;
    swaggerSpec: any;
    teamName: string;
  }): Promise<GenerationResult> {
    const { nlpInput, swaggerSpec, teamName } = options;

    // Load context
    await this.loadContext(teamName);

    // Parse NLP to understand intent
    const intent = this.parseNLPIntent(nlpInput);

    // Generate scenario using context + NLP
    const scenario = await this.generateScenario(nlpInput, swaggerSpec, intent);

    // Generate feature file
    const featureContent = this.generateFeatureFile(scenario, teamName);
    const featurePath = this.writeFeatureFile(scenario, featureContent, teamName);

    // Generate step definitions
    const stepContent = this.generateStepDefinitions(scenario, teamName);
    const stepPath = this.writeStepDefinitionFile(scenario, stepContent, teamName);

    return {
      scenarios: [scenario],
      featureFiles: [featurePath],
      stepDefinitionFiles: [stepPath]
    };
  }

  /**
   * Load context library for team
   */
  private async loadContext(teamName: string): Promise<void> {
    try {
      const loader = new ContextLoader();
      const result = await loader.loadTeamContext(teamName);
      this.context = result.context || null;
    } catch {
      console.log('   ⚠️  No context found, using defaults');
      this.context = null;
    }
  }

  /**
   * Parse NLP input to understand test intent
   */
  private parseNLPIntent(input: string): {
    expectedResponseCode: string;
    type: 'positive' | 'negative' | 'boundary' | 'security';
    dataHints: string[];
  } {
    const lowerInput = input.toLowerCase();
    
    let expectedResponseCode = 'VERIFIED';
    let type: 'positive' | 'negative' | 'boundary' | 'security' = 'positive';
    const dataHints: string[] = [];

    // Determine expected response code
    if (lowerInput.includes('not_verified') || lowerInput.includes('not verified') || 
        lowerInput.includes('invalid') || lowerInput.includes('fake') ||
        lowerInput.includes('wrong state')) {
      expectedResponseCode = 'NOT_VERIFIED';
      type = 'negative';
    } else if (lowerInput.includes('corrected') || lowerInput.includes('missing') ||
               lowerInput.includes('empty') || lowerInput.includes('without postal') ||
               lowerInput.includes('without state') || lowerInput.includes('no postal')) {
      expectedResponseCode = 'CORRECTED';
      type = 'negative';
    } else if (lowerInput.includes('street_partial') || lowerInput.includes('street partial')) {
      expectedResponseCode = 'STREET_PARTIAL';
      type = 'boundary';
    } else if (lowerInput.includes('premises_partial') || lowerInput.includes('premises partial')) {
      expectedResponseCode = 'PREMISES_PARTIAL';
      type = 'boundary';
    } else if (lowerInput.includes('security') || lowerInput.includes('injection') || lowerInput.includes('xss')) {
      type = 'security';
    }

    // Extract data hints
    if (lowerInput.includes('postal') || lowerInput.includes('zip')) dataHints.push('postal');
    if (lowerInput.includes('state')) dataHints.push('state');
    if (lowerInput.includes('city')) dataHints.push('city');

    return { expectedResponseCode, type, dataHints };
  }

  /**
   * Get test data from context based on expected response code
   */
  private getTestDataFromContext(expectedResponseCode: string): any {
    if (!this.context) {
      return this.getDefaultTestData(expectedResponseCode);
    }

    const endpoint = this.context.endpoints?.[0];
    if (!endpoint?.testPatterns) {
      return this.getDefaultTestData(expectedResponseCode);
    }

    // Find matching test pattern
    const pattern = endpoint.testPatterns.find(
      (p: TestDataPattern) => p.expectedResponseCode === expectedResponseCode
    );

    if (pattern?.data) {
      return pattern.data;
    }

    // Try global test data
    if (expectedResponseCode === 'VERIFIED' && this.context.globalTestData?.validAddresses?.length) {
      return this.context.globalTestData.validAddresses[0];
    }
    if (expectedResponseCode === 'NOT_VERIFIED' && this.context.globalTestData?.invalidAddresses?.length) {
      return this.context.globalTestData.invalidAddresses[0];
    }

    return this.getDefaultTestData(expectedResponseCode);
  }

  /**
   * Get default test data when no context available
   */
  private getDefaultTestData(expectedResponseCode: string): any {
    const testDataMap: Record<string, any> = {
      'VERIFIED': {
        streets: ['39 Dolores Dr'],
        city: 'Burlington',
        stateOrProvince: 'MA',
        postalCode: '01803',
        country: 'US'
      },
      'CORRECTED': {
        streets: ['39 Dolores Dr'],
        city: 'Burlington',
        stateOrProvince: '',  // Missing state triggers CORRECTED
        postalCode: '01803',
        country: 'US'
      },
      'NOT_VERIFIED': {
        streets: ['123 Fake Street'],
        city: 'Nowhere',
        stateOrProvince: 'XX',  // Invalid state
        postalCode: '',
        country: 'US'
      },
      'STREET_PARTIAL': {
        streets: ['Main St'],  // No street number
        city: 'Burlington',
        stateOrProvince: 'MA',
        postalCode: '01803',
        country: 'US'
      },
      'PREMISES_PARTIAL': {
        streets: ['39 Dolores Dr', 'Apt 999'],  // Wrong unit
        city: 'Burlington',
        stateOrProvince: 'MA',
        postalCode: '01803',
        country: 'US'
      }
    };

    return testDataMap[expectedResponseCode] || testDataMap['VERIFIED'];
  }

  /**
   * Generate scenario from NLP + context
   */
  private async generateScenario(
    nlpInput: string,
    swaggerSpec: any,
    intent: { expectedResponseCode: string; type: 'positive' | 'negative' | 'boundary' | 'security'; dataHints: string[] }
  ): Promise<GeneratedScenario> {
    // Create scenario name from NLP input
    const name = this.createScenarioName(nlpInput);
    const id = this.sanitizeId(name);

    // Get test data from context
    const testData = this.getTestDataFromContext(intent.expectedResponseCode);

    // Determine endpoint
    const endpoint = this.findEndpoint(swaggerSpec, nlpInput);

    // Build assertions based on response code
    const assertions = this.buildAssertions(intent.expectedResponseCode);

    // Build tags
    const tags = this.buildTags(intent);

    return {
      id,
      name,
      description: nlpInput,
      type: intent.type,
      priority: 'high',
      endpoint: endpoint.path,
      method: endpoint.method,
      testData,
      expectedResponseCode: intent.expectedResponseCode,
      expectedHttpStatus: 200,
      assertions,
      tags
    };
  }

  /**
   * Create scenario name from NLP input
   */
  private createScenarioName(nlpInput: string): string {
    // Clean up and capitalize
    return nlpInput
      .replace(/^test\s+/i, '')
      .replace(/^verify\s+/i, 'Verify ')
      .replace(/^check\s+/i, 'Verify ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 80);
  }

  /**
   * Find endpoint from swagger spec
   */
  private findEndpoint(swaggerSpec: any, nlpInput: string): { path: string; method: string } {
    const paths = swaggerSpec.paths || {};
    
    // For AVS, default to verifyAddress
    for (const [path, pathItem] of Object.entries(paths)) {
      if (path.includes('verify') || path.includes('address')) {
        for (const method of Object.keys(pathItem as any)) {
          if (['post', 'get'].includes(method)) {
            return { path, method: method.toUpperCase() };
          }
        }
      }
    }

    // Default
    const firstPath = Object.keys(paths)[0] || '/api/endpoint';
    return { path: firstPath, method: 'POST' };
  }

  /**
   * Build assertions based on response code
   */
  private buildAssertions(responseCode: string): string[] {
    const assertionMap: Record<string, string[]> = {
      'VERIFIED': [
        'Response status is 200',
        'responseCode equals VERIFIED',
        'validatedAddress is populated',
        'requestAddressSanitized is null'
      ],
      'CORRECTED': [
        'Response status is 200',
        'responseCode equals CORRECTED',
        'validatedAddress is populated'
      ],
      'NOT_VERIFIED': [
        'Response status is 200',
        'responseCode equals NOT_VERIFIED',
        'validatedAddress is null',
        'requestAddressSanitized is populated'
      ],
      'STREET_PARTIAL': [
        'Response status is 200',
        'responseCode equals STREET_PARTIAL',
        'validatedAddress is null'
      ],
      'PREMISES_PARTIAL': [
        'Response status is 200',
        'responseCode equals PREMISES_PARTIAL',
        'validatedAddress is populated'
      ]
    };

    return assertionMap[responseCode] || assertionMap['VERIFIED'];
  }

  /**
   * Build tags
   */
  private buildTags(intent: { type: string; expectedResponseCode: string }): string[] {
    const tags = ['@api', '@verifyAddress'];
    
    if (intent.type === 'positive') tags.push('@positive');
    if (intent.type === 'negative') tags.push('@negative');
    if (intent.type === 'boundary') tags.push('@boundary');
    if (intent.type === 'security') tags.push('@security');
    
    tags.push(`@${intent.expectedResponseCode.toLowerCase()}`);
    
    return tags;
  }

  /**
   * Generate Cucumber feature file content
   */
  private generateFeatureFile(scenario: GeneratedScenario, teamName: string): string {
    const testData = scenario.testData;
    const streetsDisplay = Array.isArray(testData.streets) 
      ? testData.streets[0] 
      : testData.streets;

    return `Feature: ${scenario.name}

  ${scenario.tags.join(' ')}
  Scenario: ${scenario.name}
    Given the API endpoint for ${scenario.id} test is "${scenario.endpoint}"
    And the request body for ${scenario.id} is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | ${streetsDisplay} | ${testData.city} | ${testData.stateOrProvince} | ${testData.postalCode} | ${testData.country} |
    When I send a POST request for ${scenario.id} to the address verification service
    Then the HTTP response status for ${scenario.id} should be ${scenario.expectedHttpStatus}
    And the response code for ${scenario.id} should be "${scenario.expectedResponseCode}"
${scenario.expectedResponseCode === 'VERIFIED' || scenario.expectedResponseCode === 'CORRECTED' ? `    And the validatedAddress should be populated for ${scenario.id}` : `    And the validatedAddress should be null for ${scenario.id}`}
${scenario.expectedResponseCode === 'VERIFIED' ? `    And the requestAddressSanitized should be null for ${scenario.id}` : ''}
    And the response matches the expected schema`;
  }

  /**
   * Generate TypeScript step definitions
   */
  private generateStepDefinitions(scenario: GeneratedScenario, teamName: string): string {
    return `import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';

dotenv.config();

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse<any>;
}

Given('the API endpoint for ${scenario.id} test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for ${scenario.id} is prepared with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    streets: [addressData.streets],
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    postalCode: addressData.postalCode,
    country: addressData.country,
  };
});

When('I send a POST request for ${scenario.id} to the address verification service', async function (this: CustomWorld) {
  try {
    const response = await axios.post(\`\${this.baseUrl}\${this.endpoint}\`, this.requestBody, { headers: this.headers });
    this.response = response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      this.response = error.response;
    } else {
      throw error;
    }
  }
});

Then('the HTTP response status for ${scenario.id} should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
});

Then('the response code for ${scenario.id} should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validatedAddress should be populated for ${scenario.id}', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.not.be.null;
});

Then('the validatedAddress should be null for ${scenario.id}', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.be.null;
});

Then('the requestAddressSanitized should be null for ${scenario.id}', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.be.null;
});

Then('the requestAddressSanitized should be populated for ${scenario.id}', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.not.be.null;
});
`;
  }

  /**
   * Write feature file to team-specific directory
   */
  writeFeatureFile(scenario: GeneratedScenario, content: string, teamName: string): string {
    const featuresDir = path.join(process.cwd(), 'features', 'api', teamName, 'verification');
    
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
    }

    const filename = scenario.id + '.feature';
    const filePath = path.join(featuresDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Write step definition file to team-specific directory
   */
  writeStepDefinitionFile(scenario: GeneratedScenario, content: string, teamName: string): string {
    const stepsDir = path.join(process.cwd(), 'src', 'steps', 'api', teamName);
    
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }

    const filename = scenario.id + '.steps.ts';
    const filePath = path.join(stepsDir, filename);

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Sanitize ID for filenames and step definitions
   */
  private sanitizeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

