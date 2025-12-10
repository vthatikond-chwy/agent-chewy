/**
 * OpenAI client for NLP processing and test generation
 */
import OpenAI from 'openai';
import { TestScenario, SwaggerEndpoint } from '../types.js';
import { loadConfig } from '../config.js';
export class OpenAIClient {
    client;
    config = loadConfig();
    constructor(apiKey) {
        this.client = new OpenAI({
            apiKey: apiKey || this.config.openai.apiKey
        });
    }
    /**
     * Extract test scenarios from natural language input
     * Now enhanced with domain context support for better generation
     */
    async extractTestScenarios(naturalLanguageInput, swaggerContext, domainContext) {
        const systemPrompt = `You are an expert API test architect specializing in comprehensive test coverage.

Your task is to analyze natural language test requirements along with Swagger/OpenAPI specifications 
to generate thorough test scenarios.

${domainContext ? `
## IMPORTANT: Domain-Specific Context
You have access to domain-specific knowledge about this API. USE THIS CONTEXT to generate accurate tests:

${domainContext}

Apply this domain knowledge when:
- Choosing test data (use known working examples)
- Setting expected response codes
- Writing assertions (use the correct field names and expected values)
- Naming scenarios (follow the naming conventions)
` : ''}

Generate test scenarios that cover:
1. **Positive Tests**: Happy path scenarios with valid data
2. **Negative Tests**: Error conditions, invalid inputs, missing required fields
3. **Boundary Tests**: Edge cases, min/max values, empty strings, null values
4. **Security Tests**: Authentication failures, authorization checks, injection attempts

Return ONLY valid JSON with no additional text.`;
        const userPrompt = `Natural Language Test Requirement:
${naturalLanguageInput}

Swagger/OpenAPI Context:
${JSON.stringify(swaggerContext, null, 2)}

Generate comprehensive test scenarios in this exact JSON format:
{
  "scenarios": [
    {
      "name": "Descriptive scenario name",
      "description": "Detailed description of what this test validates",
      "type": "positive|negative|boundary|security",
      "priority": "high|medium|low",
      "endpoint": "/api/path",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "testData": {},
      "expectedStatus": 200,
      "assertions": ["assertion 1", "assertion 2"],
      "prerequisites": ["prerequisite 1"],
      "tags": ["@api", "@tag"]
    }
  ]
}`;
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.openai.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: this.config.openai.temperature,
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
            console.error('Error extracting test scenarios:', error);
            throw new Error(`Failed to extract test scenarios: ${error.message}`);
        }
    }
    /**
     * Generate Cucumber/Gherkin scenario from test scenario definition
     */
    async generateCucumberScenario(scenario, endpointDetails) {
        const systemPrompt = `You are an expert in writing Cucumber/Gherkin test scenarios for API testing.

Generate clear, readable, and maintainable BDD scenarios following best practices:
- Use business-readable language
- Follow Given-When-Then structure
- Include data tables for request/response bodies
- Make assertions explicit
- Add appropriate tags

Return ONLY the Cucumber scenario text, no code blocks or additional explanation.`;
        const userPrompt = `Generate a Cucumber/Gherkin scenario for this API test:

Test Scenario:
${JSON.stringify(scenario, null, 2)}

API Endpoint Details:
${JSON.stringify(endpointDetails, null, 2)}

Format:
Feature: [Feature name based on endpoint]

@tag1 @tag2
Scenario: ${scenario.name}
  Given [setup steps]
  When [action steps]
  Then [assertion steps]`;
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.openai.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            console.error('Error generating Cucumber scenario:', error);
            throw new Error(`Failed to generate Cucumber scenario: ${error.message}`);
        }
    }
    /**
     * Generate step definitions in TypeScript
     */
    async generateStepDefinitions(cucumberScenario, endpointDetails) {
        const systemPrompt = `You are an expert in API test automation using Cucumber/BDD with TypeScript and Playwright.

Generate clean, maintainable, production-ready step definition code that:
- Uses @cucumber/cucumber decorators (Given, When, Then)
- Implements proper API request handling with axios or fetch
- Includes comprehensive assertions
- Handles authentication properly
- Has proper error handling
- Includes TypeScript types
- Is reusable and follows DRY principles

Return ONLY the TypeScript code, properly formatted.`;
        const userPrompt = `Generate TypeScript step definitions for this Cucumber scenario:

Cucumber Scenario:
${cucumberScenario}

API Endpoint Details:
${JSON.stringify(endpointDetails, null, 2)}

Requirements:
1. Use @cucumber/cucumber framework
2. Import necessary types and interfaces
3. Handle request/response properly
4. Include all assertions from the scenario
5. Add proper error handling
6. Use TypeScript with proper types
7. Make code reusable with World context`;
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.openai.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            console.error('Error generating step definitions:', error);
            throw new Error(`Failed to generate step definitions: ${error.message}`);
        }
    }
}
//# sourceMappingURL=openaiClient.js.map