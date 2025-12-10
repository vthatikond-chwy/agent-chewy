/**
 * Team-specific rules for test generation
 * These rules help the generator create correct step definitions based on team patterns
 */
import * as fs from 'fs';
import * as path from 'path';
import { extractProjectName } from './team-config.js';
/**
 * Load team-specific rules from rules.json file
 */
export function loadTeamRules(swaggerSpecPath) {
    try {
        const projectName = extractProjectName(swaggerSpecPath);
        if (!projectName) {
            return null;
        }
        // Look for rules file in swagger/teams/{project-name}/rules.json
        const specDir = path.dirname(swaggerSpecPath);
        const rulesPath = path.join(specDir, 'rules.json');
        if (!fs.existsSync(rulesPath)) {
            return null;
        }
        const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
        const rules = JSON.parse(rulesContent);
        rules.teamName = projectName;
        return rules;
    }
    catch (error) {
        console.warn(`Warning: Could not load team rules: ${error}`);
        return null;
    }
}
/**
 * Get rules context string for OpenAI prompts
 */
export function getRulesContext(rules) {
    if (!rules) {
        return '';
    }
    const context = [];
    context.push(`\n## Team-Specific Rules for ${rules.teamName.toUpperCase()}\n`);
    if (rules.responsePatterns) {
        context.push('### Response Structure:');
        if (rules.responsePatterns.arrayResponseEndpoints?.length) {
            context.push(`- These endpoints return arrays directly: ${rules.responsePatterns.arrayResponseEndpoints.join(', ')}`);
            context.push(`  Example: response.data is an array, not response.data.suggestions`);
        }
        if (rules.responsePatterns.objectResponseEndpoints?.length) {
            context.push(`- These endpoints return objects: ${rules.responsePatterns.objectResponseEndpoints.join(', ')}`);
        }
        if (rules.responsePatterns.arrayPropertyName) {
            context.push(`- Array property name in object responses: ${rules.responsePatterns.arrayPropertyName}`);
        }
        // Add detailed array response structure information
        if (rules.responsePatterns.arrayResponseStructure) {
            for (const [endpoint, structure] of Object.entries(rules.responsePatterns.arrayResponseStructure)) {
                context.push(`\n- ${endpoint} Response Structure:`);
                if (structure.description) {
                    context.push(`  ${structure.description}`);
                }
                if (structure.itemStructure) {
                    context.push(`  Each item in the array is: ${structure.itemStructure.type || 'object'}`);
                    if (structure.itemStructure.properties) {
                        context.push(`  Item properties: ${Object.keys(structure.itemStructure.properties).join(', ')}`);
                        // Highlight important nested structures
                        if (structure.itemStructure.properties.requestAddress) {
                            context.push(`  CRITICAL: Each item has a 'requestAddress' property containing the address fields`);
                            context.push(`  Use: item.requestAddress.streets, item.requestAddress.city, etc.`);
                        }
                    }
                }
                if (structure.assertionNote) {
                    context.push(`  ⚠️  IMPORTANT: ${structure.assertionNote}`);
                }
            }
        }
    }
    if (rules.normalizationRules) {
        context.push('\n### Data Normalization:');
        if (rules.normalizationRules.addressComparison) {
            context.push(`- Address comparisons should be ${rules.normalizationRules.addressComparison}`);
            if (rules.normalizationRules.addressComparison === 'case-insensitive') {
                context.push(`  Use .toUpperCase() for both expected and actual values`);
            }
        }
        if (rules.normalizationRules.postalCodeHandling) {
            context.push(`- Postal code handling: ${rules.normalizationRules.postalCodeHandling}`);
            if (rules.normalizationRules.postalCodeHandling === 'prefix-match') {
                context.push(`  API may return ZIP+4, so check if response includes request postal code`);
            }
        }
        if (rules.normalizationRules.streetNameHandling) {
            context.push(`- Street name handling: ${rules.normalizationRules.streetNameHandling}`);
            if (rules.normalizationRules.streetNameHandling === 'abbreviation-tolerant') {
                context.push(`  API may normalize "Parkway" to "PKWY", so be flexible in comparisons`);
            }
        }
    }
    if (rules.queryParameterHandling) {
        context.push('\n### Query Parameters:');
        for (const [endpoint, config] of Object.entries(rules.queryParameterHandling)) {
            if (config.parameters?.length) {
                context.push(`- ${endpoint}: Uses query parameters: ${config.parameters.join(', ')}`);
                context.push(`  Pass these as params in axios request: { params: { ${config.parameters.map(p => `${p}: value`).join(', ')} } }`);
            }
        }
    }
    if (rules.assertionPatterns) {
        context.push('\n### Assertion Patterns:');
        if (rules.assertionPatterns.responseCodeProperty) {
            context.push(`- Response code property: ${rules.assertionPatterns.responseCodeProperty}`);
            context.push(`  Use: response.data.${rules.assertionPatterns.responseCodeProperty}`);
        }
        if (rules.assertionPatterns.addressValidation) {
            const addr = rules.assertionPatterns.addressValidation;
            context.push(`- Address validation:`);
            if (addr.useValidatedAddress) {
                context.push(`  Use validatedAddress field: response.data.validatedAddress`);
            }
            if (addr.useRequestAddress) {
                context.push(`  Use requestAddress field: response.data.requestAddress`);
            }
            if (addr.compareFields?.length) {
                context.push(`  Compare these fields: ${addr.compareFields.join(', ')}`);
            }
        }
    }
    if (rules.stepDefinitionPatterns) {
        context.push('\n### Step Definition Generation Patterns:');
        if (rules.stepDefinitionPatterns.dataTableParsing) {
            const dt = rules.stepDefinitionPatterns.dataTableParsing;
            context.push('- Data Table Parsing:');
            context.push(`  - Use rowsHash() for tables with ${dt.useRowsHashForColumns || 2} columns (key-value pairs)`);
            context.push(`  - Use hashes() for tables with ${dt.useHashesForColumns || 3}+ columns (multi-column tables)`);
            if (dt.example?.twoColumn) {
                context.push(`  Example (2-column):\n${dt.example.twoColumn}`);
            }
            if (dt.example?.multiColumn) {
                context.push(`  Example (multi-column):\n${dt.example.multiColumn}`);
            }
        }
        if (rules.stepDefinitionPatterns.arrayAccessPatterns) {
            const aa = rules.stepDefinitionPatterns.arrayAccessPatterns;
            context.push('- Array Access Patterns:');
            if (aa.inArrayPattern) {
                context.push(`  - Pattern: ${aa.inArrayPattern}`);
            }
            if (aa.simpleArrayPattern) {
                context.push(`  - Simple pattern: ${aa.simpleArrayPattern}`);
            }
            if (aa.example?.inArray) {
                context.push(`  Example (in array):\n${aa.example.inArray}`);
            }
            if (aa.example?.simple) {
                context.push(`  Example (simple):\n${aa.example.simple}`);
            }
        }
        if (rules.stepDefinitionPatterns.quotedStringHandling) {
            const qs = rules.stepDefinitionPatterns.quotedStringHandling;
            context.push('- Quoted String Handling:');
            context.push(`  - Convert quoted strings to {string} placeholders: ${qs.convertToPlaceholders !== false}`);
            if (qs.example) {
                context.push(`  Example:\n${qs.example}`);
            }
        }
    }
    if (rules.featureFileGeneration) {
        context.push('\n### Feature File Generation Rules:');
        if (rules.featureFileGeneration.stepTextPatterns) {
            context.push('- Step Text Patterns:');
            const patterns = rules.featureFileGeneration.stepTextPatterns;
            if (patterns.endpointStep)
                context.push(`  - Endpoint: ${patterns.endpointStep}`);
            if (patterns.requestBodyStep)
                context.push(`  - Request Body: ${patterns.requestBodyStep}`);
            if (patterns.actionStep)
                context.push(`  - Action: ${patterns.actionStep}`);
            if (patterns.statusStep)
                context.push(`  - Status: ${patterns.statusStep}`);
            if (patterns.responseCodeStep)
                context.push(`  - Response Code: ${patterns.responseCodeStep}`);
        }
        if (rules.featureFileGeneration.dataTableFormat) {
            context.push('- Data Table Format:');
            const dtf = rules.featureFileGeneration.dataTableFormat;
            if (dtf.addressFields?.length) {
                context.push(`  - Address fields: ${dtf.addressFields.join(', ')}`);
            }
            if (dtf.note) {
                context.push(`  - Note: ${dtf.note}`);
            }
        }
        if (rules.featureFileGeneration.criticalRules?.length) {
            context.push('- Critical Rules:');
            rules.featureFileGeneration.criticalRules.forEach(rule => {
                context.push(`  - ${rule}`);
            });
        }
    }
    return context.join('\n');
}
//# sourceMappingURL=team-rules.js.map