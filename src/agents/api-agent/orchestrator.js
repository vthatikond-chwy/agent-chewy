/**
 * Main orchestrator for API test generation
 * Coordinates Swagger parsing, NLP processing, and test generation
 * Now enhanced with Context Library support for better test generation
 */
import * as fs from 'fs';
import * as path from 'path';
import { SwaggerSpecParser } from './swagger/parser.js';
import { OpenAIClient } from './nlp/openaiClient.js';
import { TestScenario, SwaggerEndpoint, GenerationOptions } from './types.js';
import { loadConfig } from './config.js';
import { ContextLoader, ApiContext } from './context/index.js';
export class ApiTestOrchestrator {
    swaggerParser;
    openaiClient;
    contextLoader;
    config = loadConfig();
    currentContext = null;
    constructor(openaiApiKey) {
        this.swaggerParser = new SwaggerSpecParser();
        this.openaiClient = new OpenAIClient(openaiApiKey);
        this.contextLoader = new ContextLoader();
    }
    /**
     * Main entry point: Generate tests from natural language
     */
    async generateFromNaturalLanguage(request) {
        const result = {
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
            // Step 0: Load domain context if available
            if (request.teamName && request.useContext !== false) {
                await this.loadTeamContext(request.teamName);
            }
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
            const scenarios = await this.generateTestScenarios(request.naturalLanguageInput, endpoints, request.options);
            console.log(`✅ Generated ${scenarios.length} test scenarios\n`);
            result.scenarios = scenarios;
            // Step 4: Generate Cucumber feature files and step definitions
            console.log('📝 Generating Cucumber features and step definitions...');
            for (const scenario of scenarios) {
                try {
                    await this.generateTestFiles(scenario, result);
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('❌ Test generation failed:', error.message);
            result.errors?.push(error.message);
            return result;
        }
    }
    /**
     * Generate tests for a specific endpoint
     */
    async generateForEndpoint(swaggerSpecPath, endpointPath, method, options) {
        await this.swaggerParser.loadSpec(swaggerSpecPath);
        const endpoint = this.swaggerParser.getEndpoint(endpointPath, method);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${method} ${endpointPath}`);
        }
        const naturalLanguageInput = this.generateNLFromEndpoint(endpoint);
        const request = {
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
    async generateForTag(swaggerSpecPath, tag, options) {
        await this.swaggerParser.loadSpec(swaggerSpecPath);
        const endpoints = this.swaggerParser.getEndpointsByTag(tag);
        if (endpoints.length === 0) {
            throw new Error(`No endpoints found with tag: ${tag}`);
        }
        const naturalLanguageInput = `Generate comprehensive tests for all ${tag} endpoints`;
        const request = {
            naturalLanguageInput,
            swaggerSpecPath,
            targetTags: [tag],
            options
        };
        return this.generateFromNaturalLanguage(request);
    }
    /**
     * Load team-specific context for enhanced test generation
     */
    async loadTeamContext(teamName) {
        console.log(`📚 Loading context for team: ${teamName}...`);
        const result = await this.contextLoader.loadTeamContext(teamName);
        if (result.success && result.context) {
            this.currentContext = result.context;
            console.log(`   ✅ Context loaded: ${result.context.domain.serviceName}`);
            console.log(`   📋 ${result.context.domain.businessRules.length} business rules`);
            console.log(`   🎯 ${result.context.endpoints.length} endpoints with context`);
            console.log(`   💡 ${result.context.generationHints.length} generation hints\n`);
        }
        else {
            console.log(`   ⚠️ No context available for ${teamName}, proceeding without domain context\n`);
        }
    }
    /**
     * Load Swagger specification from file or URL
     */
    async loadSwaggerSpec(request) {
        console.log('📖 Loading Swagger specification...');
        if (request.swaggerSpecPath) {
            await this.swaggerParser.loadSpec(request.swaggerSpecPath);
        }
        else if (request.swaggerSpecUrl) {
            await this.swaggerParser.loadSpecFromUrl(request.swaggerSpecUrl);
        }
        else {
            throw new Error('Either swaggerSpecPath or swaggerSpecUrl must be provided');
        }
        const apiInfo = this.swaggerParser.getApiInfo();
        console.log(`   API: ${apiInfo.title} (v${apiInfo.version})`);
        console.log(`   Base URL: ${this.swaggerParser.getBaseUrl()}\n`);
    }
    /**
     * Get relevant endpoints based on filters
     */
    getRelevantEndpoints(request) {
        let endpoints = this.swaggerParser.getAllEndpoints();
        // Filter by target endpoints
        if (request.targetEndpoints && request.targetEndpoints.length > 0) {
            endpoints = endpoints.filter(ep => request.targetEndpoints.includes(ep.path));
        }
        // Filter by tags
        if (request.targetTags && request.targetTags.length > 0) {
            endpoints = endpoints.filter(ep => ep.tags?.some(tag => request.targetTags.includes(tag)));
        }
        return endpoints;
    }
    /**
     * Generate test scenarios using OpenAI
     */
    async generateTestScenarios(naturalLanguageInput, endpoints, options) {
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
        // Include domain context if available for enhanced generation
        const domainContext = this.currentContext
            ? this.contextLoader.formatContextForLLM(this.currentContext)
            : undefined;
        const scenarios = await this.openaiClient.extractTestScenarios(naturalLanguageInput, swaggerContext, domainContext);
        // Filter scenarios based on options
        if (options) {
            return scenarios.filter(scenario => {
                if (scenario.type === 'positive' && !options.generatePositive)
                    return false;
                if (scenario.type === 'negative' && !options.generateNegative)
                    return false;
                if (scenario.type === 'boundary' && !options.generateBoundary)
                    return false;
                if (scenario.type === 'security' && !options.generateSecurity)
                    return false;
                return true;
            });
        }
        return scenarios;
    }
    /**
     * Generate Cucumber feature file and step definitions for a scenario
     */
    async generateTestFiles(scenario, result) {
        const endpoint = this.swaggerParser.getEndpoint(scenario.endpoint, scenario.method);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${scenario.method} ${scenario.endpoint}`);
        }
        // Generate Cucumber scenario
        const cucumberScenario = await this.openaiClient.generateCucumberScenario(scenario, endpoint);
        // Generate step definitions
        const stepDefinitions = await this.openaiClient.generateStepDefinitions(cucumberScenario, endpoint);
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
    async writeFeatureFile(scenario, content) {
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
    async writeStepDefinitionFile(scenario, content) {
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
    generateNLFromEndpoint(endpoint) {
        const action = this.getActionFromMethod(endpoint.method);
        return `Test that users can ${action} ${endpoint.path} with ${endpoint.summary || 'valid data'}`;
    }
    /**
     * Get action verb from HTTP method
     */
    getActionFromMethod(method) {
        const actions = {
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
    sanitizeFilename(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    /**
     * Get Swagger parser (for advanced use cases)
     */
    getSwaggerParser() {
        return this.swaggerParser;
    }
    /**
     * Get OpenAI client (for advanced use cases)
     */
    getOpenAIClient() {
        return this.openaiClient;
    }
    /**
     * Get context loader (for advanced use cases)
     */
    getContextLoader() {
        return this.contextLoader;
    }
    /**
     * Get currently loaded context
     */
    getCurrentContext() {
        return this.currentContext;
    }
    /**
     * Manually set context (useful for testing or custom context)
     */
    setContext(context) {
        this.currentContext = context;
    }
}
//# sourceMappingURL=orchestrator.js.map