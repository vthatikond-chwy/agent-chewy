/**
 * Context Loader - Loads and manages API context for test generation
 */
import * as fs from 'fs';
import * as path from 'path';
export class ContextLoader {
    contextCache = new Map();
    /**
     * Load context for a specific team from the swagger/teams directory
     */
    async loadTeamContext(teamName) {
        // Check cache first
        const cachedContext = this.contextCache.get(teamName);
        if (cachedContext) {
            return {
                success: true,
                context: cachedContext
            };
        }
        const contextDir = path.join(process.cwd(), 'swagger', 'teams', teamName, 'context');
        try {
            // Check if context directory exists
            if (!fs.existsSync(contextDir)) {
                // Try to build context from existing files
                return this.buildContextFromExistingFiles(teamName);
            }
            // Load main context file
            const contextFile = path.join(contextDir, 'api-context.json');
            if (!fs.existsSync(contextFile)) {
                return this.buildContextFromExistingFiles(teamName);
            }
            const contextData = JSON.parse(fs.readFileSync(contextFile, 'utf-8'));
            // Validate and cache
            this.contextCache.set(teamName, contextData);
            return {
                success: true,
                context: contextData
            };
        }
        catch (error) {
            console.error(`Error loading context for ${teamName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Build context from existing rules.json, config.json, and swagger files
     */
    async buildContextFromExistingFiles(teamName) {
        const teamDir = path.join(process.cwd(), 'swagger', 'teams', teamName);
        try {
            // Load existing files
            const rulesPath = path.join(teamDir, 'rules.json');
            const configPath = path.join(teamDir, 'config.json');
            let rules = {};
            let config = {};
            if (fs.existsSync(rulesPath)) {
                rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
            }
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            }
            // Build context from existing data
            const context = this.buildContextFromRulesAndConfig(teamName, rules, config);
            this.contextCache.set(teamName, context);
            return {
                success: true,
                context
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to build context: ${error.message}`
            };
        }
    }
    /**
     * Convert existing rules and config to API context
     */
    buildContextFromRulesAndConfig(teamName, rules, config) {
        const responseCodeBehaviors = [];
        // Convert responseCodeBehaviors if present
        if (rules.responseCodeBehaviors) {
            for (const [code, behavior] of Object.entries(rules.responseCodeBehaviors)) {
                const b = behavior;
                responseCodeBehaviors.push({
                    code,
                    description: b.description || '',
                    validatedAddressState: b.validatedAddress === 'populated' ? 'populated' : 'null',
                    sanitizedAddressState: b.requestAddressSanitized === 'populated' ? 'populated' : 'null',
                    triggers: b.triggers || [],
                    testScenarios: this.generateTestScenariosForCode(code, b.triggers || [])
                });
            }
        }
        // Build endpoints context
        const endpoints = [];
        if (rules.endpoints) {
            for (const [path, epConfig] of Object.entries(rules.endpoints)) {
                const ep = epConfig;
                endpoints.push({
                    path,
                    method: ep.method || 'POST',
                    description: ep.description || '',
                    requiredFields: rules.testData?.requiredFields?.[path] || [],
                    optionalFields: [],
                    requestSchema: {},
                    responseCodeBehaviors,
                    testPatterns: this.buildTestPatternsForEndpoint(path, rules),
                    assertionTemplates: this.buildAssertionTemplates(responseCodeBehaviors),
                    commonErrors: []
                });
            }
        }
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            team: teamName,
            domain: {
                serviceName: rules.teamName || teamName,
                serviceDescription: `${teamName.toUpperCase()} API Service`,
                businessRules: this.extractBusinessRules(rules),
                terminology: {},
                edgeCases: this.extractEdgeCases(rules),
                securityConsiderations: []
            },
            endpoints,
            globalTestData: {
                validAddresses: rules.testData?.workingAddresses ? [rules.testData.workingAddresses.verifyAddress] : [],
                invalidAddresses: [],
                boundaryData: []
            },
            generationHints: this.buildGenerationHints(rules, responseCodeBehaviors)
        };
    }
    /**
     * Generate test scenario names for a response code
     */
    generateTestScenariosForCode(code, triggers) {
        const scenarios = [];
        triggers.forEach(trigger => {
            scenarios.push(`Verify address with ${trigger.toLowerCase()} returns ${code}`);
        });
        return scenarios;
    }
    /**
     * Build test patterns for an endpoint
     */
    buildTestPatternsForEndpoint(endpointPath, rules) {
        const patterns = [];
        // Add working address pattern
        if (rules.testData?.workingAddresses?.verifyAddress) {
            patterns.push({
                name: 'Valid complete address',
                description: 'A valid US address with all fields populated correctly',
                endpoint: endpointPath,
                data: rules.testData.workingAddresses.verifyAddress,
                expectedResponseCode: 'VERIFIED',
                expectedHttpStatus: 200,
                assertions: [
                    'responseCode equals VERIFIED',
                    'validatedAddress is not null',
                    'requestAddressSanitized is null'
                ]
            });
        }
        // Add pattern for CORRECTED response
        if (rules.responseCodeBehaviors?.CORRECTED) {
            patterns.push({
                name: 'Address requiring correction',
                description: 'An address with empty postal code that gets corrected',
                endpoint: endpointPath,
                data: {
                    streets: ['600 HARLAN CT'],
                    city: 'Bonaire',
                    stateOrProvince: 'GA',
                    postalCode: '',
                    country: 'US'
                },
                expectedResponseCode: 'CORRECTED',
                expectedHttpStatus: 200,
                assertions: [
                    'responseCode equals CORRECTED',
                    'validatedAddress is not null',
                    'postalChanged equals true OR validatedAddress.postalCode is populated'
                ]
            });
        }
        return patterns;
    }
    /**
     * Build assertion templates from response code behaviors
     */
    buildAssertionTemplates(behaviors) {
        return behaviors.map(b => ({
            responseCode: b.code,
            assertions: [
                {
                    field: 'responseCode',
                    condition: 'equals',
                    expectedValue: b.code,
                    description: `Response code should be ${b.code}`
                },
                {
                    field: 'validatedAddress',
                    condition: b.validatedAddressState === 'populated' ? 'notNull' : 'isNull',
                    description: `validatedAddress should be ${b.validatedAddressState}`
                },
                {
                    field: 'requestAddressSanitized',
                    condition: b.sanitizedAddressState === 'populated' ? 'notNull' : 'isNull',
                    description: `requestAddressSanitized should be ${b.sanitizedAddressState}`
                }
            ]
        }));
    }
    /**
     * Extract business rules from rules config
     */
    extractBusinessRules(rules) {
        const businessRules = [];
        if (rules.responseCodeBehaviors) {
            for (const [code, behavior] of Object.entries(rules.responseCodeBehaviors)) {
                const b = behavior;
                businessRules.push({
                    id: `rule_${code.toLowerCase()}`,
                    name: `${code} Response Behavior`,
                    description: b.description || `Behavior for ${code} response`,
                    impact: code === 'NOT_VERIFIED' ? 'high' : 'medium',
                    testRecommendations: b.triggers?.map((t) => `Test with: ${t}`) || []
                });
            }
        }
        return businessRules;
    }
    /**
     * Extract edge cases from rules
     */
    extractEdgeCases(rules) {
        const edgeCases = [];
        // Add edge cases based on response code triggers
        if (rules.responseCodeBehaviors?.STREET_PARTIAL) {
            edgeCases.push({
                name: 'Street Only Verification',
                description: 'Address with only street name verified, not full premises',
                testData: {
                    streets: ['999 Nonexistent St'],
                    city: 'Mountain View',
                    stateOrProvince: 'CA',
                    postalCode: '94043',
                    country: 'US'
                },
                expectedBehavior: 'Returns STREET_PARTIAL with sanitized address',
                priority: 'medium'
            });
        }
        if (rules.responseCodeBehaviors?.NOT_VERIFIED) {
            edgeCases.push({
                name: 'Non-existent Address',
                description: 'Completely fake address that cannot be verified',
                testData: {
                    streets: ['12345 Fake Street'],
                    city: 'Nowhere City',
                    stateOrProvince: 'ZZ',
                    postalCode: '00000',
                    country: 'US'
                },
                expectedBehavior: 'Returns NOT_VERIFIED with sanitized address',
                priority: 'high'
            });
        }
        return edgeCases;
    }
    /**
     * Build generation hints for LLM
     */
    buildGenerationHints(rules, behaviors) {
        const hints = [];
        // Add response code hints
        behaviors.forEach(b => {
            hints.push({
                category: 'response_validation',
                hint: `When response code is ${b.code}: validatedAddress should be ${b.validatedAddressState}, requestAddressSanitized should be ${b.sanitizedAddressState}`,
                example: b.triggers[0] || undefined
            });
        });
        // Add assertion hints
        hints.push({
            category: 'assertion_pattern',
            hint: 'Always assert on responseCode first, then check validatedAddress or requestAddressSanitized based on the expected response code',
            example: 'For VERIFIED: assert responseCode=VERIFIED, validatedAddress!=null, requestAddressSanitized=null'
        });
        // Add data table hints
        hints.push({
            category: 'data_format',
            hint: 'Use data tables for address fields: streets, city, stateOrProvince, postalCode, country',
            example: '| streets | city | stateOrProvince | postalCode | country |'
        });
        // Add test naming hints
        hints.push({
            category: 'naming',
            hint: 'Name scenarios descriptively: Verify [condition] returns [expected response code]',
            example: 'Verify valid address returns VERIFIED'
        });
        return hints;
    }
    /**
     * Get context for a specific endpoint
     */
    getEndpointContext(context, endpointPath) {
        return context.endpoints.find(ep => ep.path === endpointPath);
    }
    /**
     * Get test patterns for a specific response code
     */
    getTestPatternsForResponseCode(context, responseCode) {
        const patterns = [];
        context.endpoints.forEach(ep => {
            ep.testPatterns
                .filter(p => p.expectedResponseCode === responseCode)
                .forEach(p => patterns.push(p));
        });
        return patterns;
    }
    /**
     * Format context for LLM consumption
     */
    formatContextForLLM(context) {
        const sections = [];
        // Domain overview
        sections.push(`## ${context.domain.serviceName} - Domain Context`);
        sections.push(context.domain.serviceDescription);
        sections.push('');
        // Business rules
        if (context.domain.businessRules.length > 0) {
            sections.push('### Business Rules');
            context.domain.businessRules.forEach(rule => {
                sections.push(`- **${rule.name}**: ${rule.description}`);
                if (rule.testRecommendations.length > 0) {
                    rule.testRecommendations.forEach(rec => {
                        sections.push(`  - ${rec}`);
                    });
                }
            });
            sections.push('');
        }
        // Response code behaviors
        sections.push('### Response Code Behaviors');
        context.endpoints.forEach(ep => {
            ep.responseCodeBehaviors.forEach(b => {
                sections.push(`- **${b.code}**: ${b.description}`);
                sections.push(`  - validatedAddress: ${b.validatedAddressState}`);
                sections.push(`  - requestAddressSanitized: ${b.sanitizedAddressState}`);
                sections.push(`  - Triggers: ${b.triggers.join(', ')}`);
            });
        });
        sections.push('');
        // Generation hints
        sections.push('### Test Generation Guidelines');
        context.generationHints.forEach(hint => {
            sections.push(`- [${hint.category}] ${hint.hint}`);
            if (hint.example) {
                sections.push(`  Example: ${hint.example}`);
            }
        });
        sections.push('');
        // Test patterns
        sections.push('### Known Working Test Patterns');
        context.endpoints.forEach(ep => {
            ep.testPatterns.forEach(pattern => {
                sections.push(`- **${pattern.name}**: ${pattern.description}`);
                sections.push(`  - Expected: ${pattern.expectedResponseCode} (HTTP ${pattern.expectedHttpStatus})`);
                sections.push(`  - Data: ${JSON.stringify(pattern.data)}`);
            });
        });
        return sections.join('\n');
    }
    /**
     * Clear context cache
     */
    clearCache() {
        this.contextCache.clear();
    }
    /**
     * Save context to file
     */
    async saveContext(teamName, context) {
        const contextDir = path.join(process.cwd(), 'swagger', 'teams', teamName, 'context');
        // Create directory if it doesn't exist
        if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
        }
        const contextFile = path.join(contextDir, 'api-context.json');
        fs.writeFileSync(contextFile, JSON.stringify(context, null, 2), 'utf-8');
        // Update cache
        this.contextCache.set(teamName, context);
        console.log(`✅ Context saved for ${teamName} at ${contextFile}`);
    }
}
export const contextLoader = new ContextLoader();
//# sourceMappingURL=context-loader.js.map