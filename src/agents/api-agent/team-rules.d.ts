/**
 * Team-specific rules for test generation
 * These rules help the generator create correct step definitions based on team patterns
 */
export interface TeamRules {
    teamName: string;
    responsePatterns?: {
        arrayResponseEndpoints?: string[];
        objectResponseEndpoints?: string[];
        arrayPropertyName?: string;
        arrayResponseStructure?: {
            [endpoint: string]: {
                description?: string;
                structure?: string;
                itemStructure?: {
                    type?: string;
                    properties?: any;
                };
                assertionNote?: string;
            };
        };
    };
    normalizationRules?: {
        addressComparison?: 'case-insensitive' | 'case-sensitive' | 'normalized';
        postalCodeHandling?: 'exact' | 'prefix-match' | 'normalized';
        streetNameHandling?: 'exact' | 'abbreviation-tolerant' | 'normalized';
    };
    queryParameterHandling?: {
        [endpoint: string]: {
            parameters?: string[];
            required?: string[];
        };
    };
    assertionPatterns?: {
        responseCodeProperty?: string;
        responseCodeValues?: string[];
        addressValidation?: {
            useValidatedAddress?: boolean;
            useRequestAddress?: boolean;
            compareFields?: string[];
        };
    };
    errorHandling?: {
        errorProperty?: string;
        errorCodeProperty?: string;
    };
    testData?: {
        workingAddresses?: {
            [endpoint: string]: {
                streets?: string[];
                city?: string;
                stateOrProvince?: string;
                postalCode?: string;
                country?: string;
            };
        };
        requiredFields?: {
            [endpoint: string]: string[];
        };
        optionalFields?: {
            [endpoint: string]: string[];
        };
    };
    stepDefinitionPatterns?: {
        dataTableParsing?: {
            useRowsHashForColumns?: number;
            useHashesForColumns?: number;
            example?: {
                twoColumn?: string;
                multiColumn?: string;
            };
        };
        arrayAccessPatterns?: {
            inArrayPattern?: string;
            simpleArrayPattern?: string;
            example?: {
                inArray?: string;
                simple?: string;
            };
        };
        quotedStringHandling?: {
            convertToPlaceholders?: boolean;
            example?: string;
        };
    };
    featureFileGeneration?: {
        stepTextPatterns?: {
            endpointStep?: string;
            requestBodyStep?: string;
            actionStep?: string;
            statusStep?: string;
            responseCodeStep?: string;
        };
        dataTableFormat?: {
            addressFields?: string[];
            note?: string;
        };
        criticalRules?: string[];
    };
}
/**
 * Load team-specific rules from rules.json file
 */
export declare function loadTeamRules(swaggerSpecPath: string): TeamRules | null;
/**
 * Get rules context string for OpenAI prompts
 */
export declare function getRulesContext(rules: TeamRules | null): string;
//# sourceMappingURL=team-rules.d.ts.map