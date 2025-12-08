/**
 * Main orchestrator for API test generation
 * Coordinates Swagger parsing, NLP processing, and test generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { SwaggerSpecParser } from './swagger/parser.js';
import { OpenAIClient } from './nlp/openaiClient.js';
import { TestScenario, SwaggerEndpoint, GenerationOptions } from './types.js';
import { loadConfig } from './config.js';

export interface GenerationRequest {
  naturalLanguageInput: string;
  swaggerSpecPath?: string | undefined;
  swaggerSpecUrl?: string | undefined;
  targetEndpoints?: string[] | undefined;
  targetTags?: string[] | undefined;
  options?: GenerationOptions | undefined;
}

export interface GenerationResult {
  success: boolean;
  scenarios: TestScenario[];
  generatedFiles: {
    features: string[];
    stepDefinitions: string[];
  };
  errors?: string[] | undefined;
}

export class ApiTestOrchestrator {
  private swaggerParser: SwaggerSpecParser;
  private openaiClient: OpenAIClient;
  private config = loadConfig();

  constructor(openaiApiKey?: string) {
    this.swaggerParser = new SwaggerSpecParser();
    this.openaiClient = new OpenAIClient(openaiApiKey);
  }

  /**
   * Main entry point: Generate tests from natural language
   */
  async generateFromNaturalLanguage(
    request: GenerationRequest
  ): Promise<GenerationResult> {
    const result: GenerationResult = {
      success: false,
      scenarios: [],
      generatedFiles: {
        features: [],
        stepDefinitions: []
      },
      errors: []
    };

    try {
      console.log('🚀 Starting API test generation...\n');

      // Step 1: Load Swagger specification
      await this.loadSwaggerSpec(request);

      // Step 2: Get relevant endpoints
      const endpoints = this.getRelevantEndpoints(request);
      console.log(`📋 Found ${endpoints.length} relevant endpoints\n`);

      if (endpoints.length === 0) {
        throw new Error('No matching endpoints found in Swagger specification');
      }

      // Step 3: Generate test scenarios using NLP
      console.log('🤖 Generating test scenarios with AI...');
      const scenarios = await this.generateTestScenarios(
        request.naturalLanguageInput,
        endpoints,
        request.options
      );
      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);

      result.scenarios = scenarios;

      // Step 4: Generate Cucumber feature files and step definitions
      console.log('📝 Generating Cucumber features and step definitions...');
      for (const scenario of scenarios) {
        try {
          await this.generateTestFiles(scenario, result);
        } catch (error: any) {
          console.error(`❌ Error generating files for scenario: ${scenario.name}`);
          result.errors?.push(`${scenario.name}: ${error.message}`);
        }
      }

      result.success = result.generatedFiles.features.length > 0;
      
      console.log('\n✨ Test generation complete!');
      console.log(`   Features: ${result.generatedFiles.features.length}`);
      console.log(`   Step Definitions: ${result.generatedFiles.stepDefinitions.length}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Test generation failed:', error.message);
      result.errors?.push(error.message);
      return result;
    }
  }

  /**
   * Generate tests for a specific endpoint
   */
  async generateForEndpoint(
    swaggerSpecPath: string,
    endpointPath: string,
    method: string,
    options?: GenerationOptions | undefined
  ): Promise<GenerationResult> {
    await this.swaggerParser.loadSpec(swaggerSpecPath);
    
    const endpoint = this.swaggerParser.getEndpoint(endpointPath, method);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${method} ${endpointPath}`);
    }

    const naturalLanguageInput = this.generateNLFromEndpoint(endpoint);

    const request: GenerationRequest = {
      naturalLanguageInput,
      swaggerSpecPath,
      targetEndpoints: [endpointPath],
      options
    };

    return this.generateFromNaturalLanguage(request);
  }

  /**
   * Generate tests for all endpoints with a specific tag
   */
  async generateForTag(
    swaggerSpecPath: string,
    tag: string,
    options?: GenerationOptions | undefined
  ): Promise<GenerationResult> {
    await this.swaggerParser.loadSpec(swaggerSpecPath);
    
    const endpoints = this.swaggerParser.getEndpointsByTag(tag);
    if (endpoints.length === 0) {
      throw new Error(`No endpoints found with tag: ${tag}`);
    }

    const naturalLanguageInput = `Generate comprehensive tests for all ${tag} endpoints`;

    const request: GenerationRequest = {
      naturalLanguageInput,
      swaggerSpecPath,
      targetTags: [tag],
      options
    };

    return this.generateFromNaturalLanguage(request);
  }

  /**
   * Load Swagger specification from file or URL
   */
  private async loadSwaggerSpec(request: GenerationRequest): Promise<void> {
    console.log('📖 Loading Swagger specification...');

    if (request.swaggerSpecPath) {
      await this.swaggerParser.loadSpec(request.swaggerSpecPath);
    } else if (request.swaggerSpecUrl) {
      await this.swaggerParser.loadSpecFromUrl(request.swaggerSpecUrl);
    } else {
      throw new Error('Either swaggerSpecPath or swaggerSpecUrl must be provided');
    }

    const apiInfo = this.swaggerParser.getApiInfo();
    console.log(`   API: ${apiInfo.title} (v${apiInfo.version})`);
    console.log(`   Base URL: ${this.swaggerParser.getBaseUrl()}\n`);
  }

  /**
   * Get relevant endpoints based on filters
   */
  private getRelevantEndpoints(request: GenerationRequest): SwaggerEndpoint[] {
    let endpoints = this.swaggerParser.getAllEndpoints();

    // Filter by target endpoints
    if (request.targetEndpoints && request.targetEndpoints.length > 0) {
      endpoints = endpoints.filter(ep => 
        request.targetEndpoints!.includes(ep.path)
      );
    }

    // Filter by tags
    if (request.targetTags && request.targetTags.length > 0) {
      endpoints = endpoints.filter(ep =>
        ep.tags?.some(tag => request.targetTags!.includes(tag))
      );
    }

    return endpoints;
  }

  /**
   * Generate test scenarios using OpenAI
   */
  private async generateTestScenarios(
    naturalLanguageInput: string,
    endpoints: SwaggerEndpoint[],
    options?: GenerationOptions | undefined
  ): Promise<TestScenario[]> {
    const swaggerContext = {
      apiInfo: this.swaggerParser.getApiInfo(),
      baseUrl: this.swaggerParser.getBaseUrl(),
      endpoints: endpoints.map(ep => ({
        path: ep.path,
        method: ep.method,
        summary: ep.summary,
        description: ep.description,
        tags: ep.tags,
        parameters: ep.parameters,
        requestBodySchema: this.swaggerParser.getRequestBodySchema(ep),
        responseSchema: this.swaggerParser.getResponseSchema(ep)
      })),
      securitySchemes: this.swaggerParser.getSecuritySchemes()
    };

    const scenarios = await this.openaiClient.extractTestScenarios(
      naturalLanguageInput,
      swaggerContext
    );

    // Filter scenarios based on options
    if (options) {
      return scenarios.filter(scenario => {
        if (scenario.type === 'positive' && !options.generatePositive) return false;
        if (scenario.type === 'negative' && !options.generateNegative) return false;
        if (scenario.type === 'boundary' && !options.generateBoundary) return false;
        if (scenario.type === 'security' && !options.generateSecurity) return false;
        return true;
      });
    }

    return scenarios;
  }

  /**
   * Generate Cucumber feature file and step definitions for a scenario
   */
  private async generateTestFiles(
    scenario: TestScenario,
    result: GenerationResult
  ): Promise<void> {
    const endpoint = this.swaggerParser.getEndpoint(scenario.endpoint, scenario.method);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${scenario.method} ${scenario.endpoint}`);
    }

    // Generate Cucumber scenario
    const cucumberScenario = await this.openaiClient.generateCucumberScenario(
      scenario,
      endpoint
    );

    // Generate step definitions
    const stepDefinitions = await this.openaiClient.generateStepDefinitions(
      cucumberScenario,
      endpoint
    );

    // Write feature file
    const featurePath = await this.writeFeatureFile(scenario, cucumberScenario);
    result.generatedFiles.features.push(featurePath);

    // Write step definition file
    const stepDefPath = await this.writeStepDefinitionFile(scenario, stepDefinitions);
    result.generatedFiles.stepDefinitions.push(stepDefPath);

    console.log(`   ✅ ${scenario.name}`);
  }

  /**
   * Write Cucumber feature file
   */
  private async writeFeatureFile(
    scenario: TestScenario,
    content: string
  ): Promise<string> {
    const featuresDir = path.join(process.cwd(), this.config.output.featuresDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(featuresDir)) {
      fs.mkdirSync(featuresDir, { recursive: true });
    }

    // Generate filename from scenario name
    const filename = this.sanitizeFilename(scenario.name) + '.feature';
    const filePath = path.join(featuresDir, filename);

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write step definition file
   */
  private async writeStepDefinitionFile(
    scenario: TestScenario,
    content: string
  ): Promise<string> {
    const stepsDir = path.join(process.cwd(), this.config.output.stepsDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(stepsDir)) {
      fs.mkdirSync(stepsDir, { recursive: true });
    }

    // Generate filename from scenario name
    const filename = this.sanitizeFilename(scenario.name) + '.steps.ts';
    const filePath = path.join(stepsDir, filename);

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Generate natural language description from endpoint
   */
  private generateNLFromEndpoint(endpoint: SwaggerEndpoint): string {
    const action = this.getActionFromMethod(endpoint.method);
    return `Test that users can ${action} ${endpoint.path} with ${endpoint.summary || 'valid data'}`;
  }

  /**
   * Get action verb from HTTP method
   */
  private getActionFromMethod(method: string): string {
    const actions: Record<string, string> = {
      'GET': 'retrieve',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'modify',
      'DELETE': 'delete'
    };
    return actions[method.toUpperCase()] || 'interact with';
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

  /**
   * Get Swagger parser (for advanced use cases)
   */
  getSwaggerParser(): SwaggerSpecParser {
    return this.swaggerParser;
  }

  /**
   * Get OpenAI client (for advanced use cases)
   */
  getOpenAIClient(): OpenAIClient {
    return this.openaiClient;
  }
}
