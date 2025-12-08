/**
 * Team-specific rules for test generation
 * These rules help the generator create correct step definitions based on team patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractProjectName } from './team-config.js';

export interface TeamRules {
  teamName: string;
  
  // API Response Patterns
  responsePatterns?: {
    // Some endpoints return arrays directly, others return objects with arrays
    arrayResponseEndpoints?: string[]; // Endpoints that return arrays directly
    objectResponseEndpoints?: string[]; // Endpoints that return objects with nested arrays
    arrayPropertyName?: string; // Property name for arrays in object responses (e.g., "suggestions", "items")
    // Detailed response structure for array endpoints
    arrayResponseStructure?: {
      [endpoint: string]: {
        description?: string;
        structure?: string;
        itemStructure?: {
          type?: string;
          properties?: any;
        };
        assertionNote?: string; // Important note about how to assert the response
      };
    };
  };
  
  // Address/Data Normalization Rules
  normalizationRules?: {
    // Address validation rules
    addressComparison?: 'case-insensitive' | 'case-sensitive' | 'normalized';
    postalCodeHandling?: 'exact' | 'prefix-match' | 'normalized'; // ZIP+4 handling
    streetNameHandling?: 'exact' | 'abbreviation-tolerant' | 'normalized';
  };
  
  // Query Parameter Handling
  queryParameterHandling?: {
    // Endpoints that use query parameters
    [endpoint: string]: {
      parameters?: string[]; // List of query parameters this endpoint uses
      required?: string[]; // Required query parameters
    };
  };
  
  // Assertion Patterns
  assertionPatterns?: {
    // How to check response codes/status
    responseCodeProperty?: string; // Property name for response code (e.g., "responseCode", "status")
    responseCodeValues?: string[]; // Valid response code values
    // How to validate addresses
    addressValidation?: {
      useValidatedAddress?: boolean; // Use validatedAddress field
      useRequestAddress?: boolean; // Use requestAddress field
      compareFields?: string[]; // Fields to compare (e.g., ["city", "stateOrProvince", "country"])
    };
  };
  
  // Error Handling
  errorHandling?: {
    // Expected error response structure
    errorProperty?: string; // Property name for error message (e.g., "message", "error")
    errorCodeProperty?: string; // Property name for error code
  };
}

/**
 * Load team-specific rules from rules.json file
 */
export function loadTeamRules(swaggerSpecPath: string): TeamRules | null {
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
    const rules: TeamRules = JSON.parse(rulesContent);
    rules.teamName = projectName;

    return rules;
  } catch (error) {
    console.warn(`Warning: Could not load team rules: ${error}`);
    return null;
  }
}

/**
 * Get rules context string for OpenAI prompts
 */
export function getRulesContext(rules: TeamRules | null): string {
  if (!rules) {
    return '';
  }

  const context: string[] = [];
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

  return context.join('\n');
}

