/**
 * Context Builder - Programmatically build API context from various sources
 * This can analyze code, swagger specs, and existing tests to build context
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ApiContext,
  DomainContext,
  EndpointContext,
  ResponseCodeBehavior,
  TestDataPattern,
  AssertionTemplate,
  BusinessRule,
  EdgeCase,
  GenerationHint,
  FieldValidation
} from './types.js';

export interface ContextBuilderOptions {
  teamName: string;
  swaggerPath?: string;
  existingRulesPath?: string;
  existingConfigPath?: string;
  includeExamples?: boolean;
}

export class ContextBuilder {
  private context: Partial<ApiContext>;
  private teamName: string;

  constructor(teamName: string) {
    this.teamName = teamName;
    this.context = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      team: teamName,
      endpoints: [],
      globalTestData: {
        validAddresses: [],
        invalidAddresses: [],
        boundaryData: []
      },
      generationHints: []
    };
  }

  /**
   * Set domain context
   */
  withDomainContext(domain: DomainContext): ContextBuilder {
    this.context.domain = domain;
    return this;
  }

  /**
   * Add an endpoint context
   */
  addEndpoint(endpoint: EndpointContext): ContextBuilder {
    this.context.endpoints?.push(endpoint);
    return this;
  }

  /**
   * Add a generation hint
   */
  addGenerationHint(hint: GenerationHint): ContextBuilder {
    this.context.generationHints?.push(hint);
    return this;
  }

  /**
   * Add valid test data
   */
  addValidTestData(data: Record<string, any>): ContextBuilder {
    this.context.globalTestData?.validAddresses.push(data);
    return this;
  }

  /**
   * Add invalid test data
   */
  addInvalidTestData(data: Record<string, any>): ContextBuilder {
    this.context.globalTestData?.invalidAddresses.push(data);
    return this;
  }

  /**
   * Build context from swagger specification
   */
  async buildFromSwagger(swaggerPath: string): Promise<ContextBuilder> {
    const swaggerContent = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));
    
    // Extract endpoints from swagger
    if (swaggerContent.paths) {
      for (const [path, methods] of Object.entries(swaggerContent.paths)) {
        for (const [method, details] of Object.entries(methods as Record<string, any>)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            const endpoint = this.buildEndpointFromSwagger(path, method, details, swaggerContent);
            this.addEndpoint(endpoint);
          }
        }
      }
    }

    // Extract schema definitions for field validation
    if (swaggerContent.definitions) {
      this.extractSchemaValidations(swaggerContent.definitions);
    }

    return this;
  }

  /**
   * Build endpoint context from swagger path
   */
  private buildEndpointFromSwagger(
    path: string,
    method: string,
    details: any,
    swagger: any
  ): EndpointContext {
    const requestSchema: Record<string, FieldValidation> = {};
    const requiredFields: string[] = [];
    const optionalFields: string[] = [];

    // Extract request body schema
    if (details.parameters) {
      details.parameters.forEach((param: any) => {
        if (param.in === 'body' && param.schema) {
          const schemaRef = param.schema.$ref;
          if (schemaRef) {
            const schemaName = schemaRef.split('/').pop();
            const schema = swagger.definitions?.[schemaName];
            if (schema?.properties) {
              for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
                const fd = fieldDef as any;
                const isRequired = schema.required?.includes(fieldName) || false;
                
                requestSchema[fieldName] = {
                  field: fieldName,
                  type: fd.type || 'string',
                  required: isRequired,
                  description: fd.description,
                  example: fd.example,
                  enum: fd.enum
                };

                if (isRequired) {
                  requiredFields.push(fieldName);
                } else {
                  optionalFields.push(fieldName);
                }
              }
            }
          }
        }
      });
    }

    return {
      path,
      method: method.toUpperCase(),
      description: details.summary || details.description || '',
      requiredFields,
      optionalFields,
      requestSchema,
      responseCodeBehaviors: [],
      testPatterns: [],
      assertionTemplates: [],
      commonErrors: []
    };
  }

  /**
   * Extract schema validations from definitions
   */
  private extractSchemaValidations(definitions: Record<string, any>): void {
    // Store for later use in generation hints
    const responseSchemas: string[] = [];
    
    for (const [name, schema] of Object.entries(definitions)) {
      if (schema.properties) {
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          const pd = propDef as any;
          if (pd.enum) {
            this.addGenerationHint({
              category: 'schema_enum',
              hint: `${name}.${propName} can only be one of: ${pd.enum.join(', ')}`,
              example: pd.enum[0]
            });
          }
        }
      }
    }
  }

  /**
   * Build the final context
   */
  build(): ApiContext {
    if (!this.context.domain) {
      this.context.domain = {
        serviceName: this.teamName,
        serviceDescription: `${this.teamName.toUpperCase()} API Service`,
        businessRules: [],
        terminology: {},
        edgeCases: [],
        securityConsiderations: []
      };
    }

    return this.context as ApiContext;
  }

  /**
   * Save context to file
   */
  async save(): Promise<string> {
    const contextDir = path.join(process.cwd(), 'swagger', 'teams', this.teamName, 'context');
    
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    const contextFile = path.join(contextDir, 'api-context.json');
    const context = this.build();
    
    fs.writeFileSync(contextFile, JSON.stringify(context, null, 2), 'utf-8');
    
    return contextFile;
  }
}

/**
 * Create a pre-configured AVS context builder
 */
export function createAVSContextBuilder(): ContextBuilder {
  const builder = new ContextBuilder('avs');

  // Set AVS-specific domain context
  builder.withDomainContext({
    serviceName: 'Address Verification Service (AVS)',
    serviceDescription: 'REST API for validating and correcting US postal addresses. The service verifies addresses against USPS database and returns standardized, deliverable addresses.',
    businessRules: [
      {
        id: 'br_verified',
        name: 'VERIFIED Response',
        description: 'Address is valid and complete - no corrections needed. The validatedAddress field contains the verified address.',
        impact: 'high',
        testRecommendations: [
          'Test with known valid addresses (e.g., Google HQ: 1600 Amphitheatre Pkwy, Mountain View, CA 94043)',
          'Verify validatedAddress is populated',
          'Verify requestAddressSanitized is null'
        ]
      },
      {
        id: 'br_corrected',
        name: 'CORRECTED Response',
        description: 'Address is valid but some fields were corrected or added (e.g., ZIP+4 added, city name corrected).',
        impact: 'high',
        testRecommendations: [
          'Test with address missing postal code',
          'Test with misspelled city name',
          'Test with missing state and postal code',
          'Check cityChanged, postalChanged, stateProvinceChanged, streetChanged flags'
        ]
      },
      {
        id: 'br_street_partial',
        name: 'STREET_PARTIAL Response',
        description: 'Only the street name is verified, not the full premises (e.g., house number is incorrect).',
        impact: 'medium',
        testRecommendations: [
          'Test with wrong street number but valid street name',
          'Test with street name only (no number)',
          'Verify requestAddressSanitized is populated'
        ]
      },
      {
        id: 'br_premises_partial',
        name: 'PREMISES_PARTIAL Response',
        description: 'Street address is partially verified. Apartment/unit number may be missing or incorrect.',
        impact: 'medium',
        testRecommendations: [
          'Test with valid street address but missing apartment number',
          'Verify validatedAddress is populated'
        ]
      },
      {
        id: 'br_not_verified',
        name: 'NOT_VERIFIED Response',
        description: 'Address cannot be verified - invalid or non-existent.',
        impact: 'high',
        testRecommendations: [
          'Test with completely fake address',
          'Test with mismatched city/state/postal code',
          'Verify validatedAddress is null',
          'Verify requestAddressSanitized is populated'
        ]
      }
    ],
    terminology: {
      'responseCode': 'The verification result code (VERIFIED, CORRECTED, STREET_PARTIAL, PREMISES_PARTIAL, NOT_VERIFIED)',
      'validatedAddress': 'The corrected/verified address returned when verification succeeds',
      'requestAddressSanitized': 'The sanitized version of the input address, returned when verification fails',
      'shippableResponseCode': 'Indicates if address is shippable (SHIPPABLE, NOT_SHIPPABLE, NOT_VALIDATED)',
      'geocodeData': 'Latitude/longitude coordinates with confidence level',
      'engine': 'The validation engine used (AVS_FEDEX, AVS_EXPERIAN)'
    },
    edgeCases: [
      {
        name: 'Empty Postal Code Correction',
        description: 'Address with all fields except postal code should return CORRECTED with postal code filled in',
        testData: {
          streets: ['600 HARLAN CT'],
          city: 'Bonaire',
          stateOrProvince: 'GA',
          postalCode: '',
          country: 'US'
        },
        expectedBehavior: 'CORRECTED with postalChanged=true',
        priority: 'high'
      },
      {
        name: 'Wrong City Name Correction',
        description: 'Valid street with slightly wrong city name should return CORRECTED',
        testData: {
          streets: ['1600 Amphitheatre Pkwy'],
          city: 'Mtn View',
          stateOrProvince: 'CA',
          postalCode: '94043',
          country: 'US'
        },
        expectedBehavior: 'CORRECTED with cityChanged=true',
        priority: 'high'
      },
      {
        name: 'Invalid State Code',
        description: 'Address with non-existent state code',
        testData: {
          streets: ['123 Main St'],
          city: 'Anytown',
          stateOrProvince: 'ZZ',
          postalCode: '12345',
          country: 'US'
        },
        expectedBehavior: 'NOT_VERIFIED',
        priority: 'medium'
      },
      {
        name: 'Military APO Address',
        description: 'Military APO/FPO addresses have special handling',
        testData: {
          streets: ['PSC 1234 Box 5678'],
          city: 'APO',
          stateOrProvince: 'AE',
          postalCode: '09001',
          country: 'US'
        },
        expectedBehavior: 'May require special validation engine',
        priority: 'low'
      },
      {
        name: 'PO Box Address',
        description: 'Post Office Box addresses',
        testData: {
          streets: ['PO Box 1234'],
          city: 'Mountain View',
          stateOrProvince: 'CA',
          postalCode: '94042',
          country: 'US'
        },
        expectedBehavior: 'Should return VERIFIED or CORRECTED',
        priority: 'medium'
      }
    ],
    securityConsiderations: [
      {
        name: 'Input Sanitization',
        description: 'All address fields should be sanitized to prevent injection attacks',
        testApproach: 'Test with SQL injection patterns, XSS payloads in address fields'
      },
      {
        name: 'Rate Limiting',
        description: 'API should have rate limiting to prevent abuse',
        testApproach: 'Monitor for 429 responses under high load'
      }
    ]
  });

  // Add verify address endpoint context
  builder.addEndpoint({
    path: '/avs/v1.0/verifyAddress',
    method: 'POST',
    description: 'Validates a single address and returns verification result with corrected address if applicable',
    requiredFields: ['streets'],
    optionalFields: ['city', 'stateOrProvince', 'postalCode', 'country', 'addressType', 'geocodeData'],
    requestSchema: {
      streets: {
        field: 'streets',
        type: 'array',
        required: true,
        description: 'Street address lines (at least 1 required)'
      },
      city: {
        field: 'city',
        type: 'string',
        required: false,
        description: 'City name'
      },
      stateOrProvince: {
        field: 'stateOrProvince',
        type: 'string',
        required: false,
        description: 'State or province code (e.g., CA, NY)'
      },
      postalCode: {
        field: 'postalCode',
        type: 'string',
        required: false,
        description: 'Postal/ZIP code'
      },
      country: {
        field: 'country',
        type: 'string',
        required: false,
        description: 'Country code (defaults to US)'
      }
    },
    responseCodeBehaviors: [
      {
        code: 'VERIFIED',
        description: 'Address is valid and complete',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: ['Valid complete address', 'All fields correct'],
        testScenarios: ['Verify valid address returns VERIFIED']
      },
      {
        code: 'CORRECTED',
        description: 'Address is valid but some fields were corrected',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: ['Empty postal code', 'Incorrect city', 'Wrong state', 'Missing state and postal'],
        testScenarios: [
          'Verify address with empty postal code returns CORRECTED',
          'Verify address with wrong city name returns CORRECTED'
        ]
      },
      {
        code: 'STREET_PARTIAL',
        description: 'Only street name verified, not full premises',
        validatedAddressState: 'null',
        sanitizedAddressState: 'populated',
        triggers: ['Wrong street number', 'Street name without number'],
        testScenarios: ['Verify address with wrong street number returns STREET_PARTIAL']
      },
      {
        code: 'PREMISES_PARTIAL',
        description: 'Street partially verified',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: ['Partial premises match', 'Missing apartment number'],
        testScenarios: ['Verify apartment address without unit returns PREMISES_PARTIAL']
      },
      {
        code: 'NOT_VERIFIED',
        description: 'Address cannot be verified',
        validatedAddressState: 'null',
        sanitizedAddressState: 'populated',
        triggers: ['Mismatched city/state/postal', 'Non-existent address', 'Fake address'],
        testScenarios: [
          'Verify fake address returns NOT_VERIFIED',
          'Verify mismatched city and postal returns NOT_VERIFIED'
        ]
      }
    ],
    testPatterns: [
      {
        name: 'Valid Complete Address',
        description: 'Known valid US address with all fields',
        endpoint: '/avs/v1.0/verifyAddress',
        data: {
          streets: ['1600 Amphitheatre Pkwy'],
          city: 'Mountain View',
          stateOrProvince: 'CA',
          postalCode: '94043',
          country: 'US'
        },
        expectedResponseCode: 'VERIFIED',
        expectedHttpStatus: 200,
        assertions: [
          'responseCode equals VERIFIED',
          'validatedAddress is not null',
          'requestAddressSanitized is null'
        ]
      },
      {
        name: 'Empty Postal Code Correction',
        description: 'Valid address without postal code - should be corrected',
        endpoint: '/avs/v1.0/verifyAddress',
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
          'validatedAddress.postalCode is not empty'
        ]
      },
      {
        name: 'Completely Fake Address',
        description: 'Non-existent address that cannot be verified',
        endpoint: '/avs/v1.0/verifyAddress',
        data: {
          streets: ['99999 Nonexistent Boulevard'],
          city: 'Faketown',
          stateOrProvince: 'ZZ',
          postalCode: '00000',
          country: 'US'
        },
        expectedResponseCode: 'NOT_VERIFIED',
        expectedHttpStatus: 200,
        assertions: [
          'responseCode equals NOT_VERIFIED',
          'validatedAddress is null',
          'requestAddressSanitized is not null'
        ]
      }
    ],
    assertionTemplates: [
      {
        responseCode: 'VERIFIED',
        assertions: [
          { field: 'responseCode', condition: 'equals', expectedValue: 'VERIFIED', description: 'Response code should be VERIFIED' },
          { field: 'validatedAddress', condition: 'notNull', description: 'validatedAddress should be populated' },
          { field: 'requestAddressSanitized', condition: 'isNull', description: 'requestAddressSanitized should be null' }
        ]
      },
      {
        responseCode: 'CORRECTED',
        assertions: [
          { field: 'responseCode', condition: 'equals', expectedValue: 'CORRECTED', description: 'Response code should be CORRECTED' },
          { field: 'validatedAddress', condition: 'notNull', description: 'validatedAddress should be populated' },
          { field: 'requestAddressSanitized', condition: 'isNull', description: 'requestAddressSanitized should be null' }
        ]
      },
      {
        responseCode: 'NOT_VERIFIED',
        assertions: [
          { field: 'responseCode', condition: 'equals', expectedValue: 'NOT_VERIFIED', description: 'Response code should be NOT_VERIFIED' },
          { field: 'validatedAddress', condition: 'isNull', description: 'validatedAddress should be null' },
          { field: 'requestAddressSanitized', condition: 'notNull', description: 'requestAddressSanitized should be populated' }
        ]
      }
    ],
    commonErrors: [
      {
        name: 'Empty Request Body',
        httpStatus: 400,
        cause: 'Request body is empty or missing',
        testData: {}
      },
      {
        name: 'Missing Streets Field',
        httpStatus: 400,
        cause: 'Required field "streets" is missing',
        testData: {
          city: 'Mountain View',
          stateOrProvince: 'CA'
        }
      }
    ]
  });

  // Add suggest addresses endpoint
  builder.addEndpoint({
    path: '/avs/v1.0/suggestAddresses',
    method: 'POST',
    description: 'Returns address suggestions when the input address is not fully valid',
    requiredFields: ['streets'],
    optionalFields: ['city', 'stateOrProvince', 'postalCode', 'country'],
    requestSchema: {
      streets: {
        field: 'streets',
        type: 'array',
        required: true,
        description: 'Street address lines'
      }
    },
    responseCodeBehaviors: [],
    testPatterns: [
      {
        name: 'Get Suggestions for Partial Address',
        description: 'Get address suggestions for incomplete address',
        endpoint: '/avs/v1.0/suggestAddresses',
        data: {
          streets: ['1600 Amphitheatre'],
          city: 'Mountain View',
          stateOrProvince: 'CA',
          country: 'US'
        },
        expectedResponseCode: 'N/A',
        expectedHttpStatus: 200,
        assertions: [
          'Response is an array',
          'Array contains at least one suggestion'
        ]
      }
    ],
    assertionTemplates: [],
    commonErrors: []
  });

  // Add global test data
  builder.addValidTestData({
    streets: ['1600 Amphitheatre Pkwy'],
    city: 'Mountain View',
    stateOrProvince: 'CA',
    postalCode: '94043',
    country: 'US'
  });

  builder.addValidTestData({
    streets: ['600 HARLAN CT'],
    city: 'Bonaire',
    stateOrProvince: 'GA',
    postalCode: '31005-5427',
    country: 'US'
  });

  builder.addInvalidTestData({
    streets: ['99999 Fake Street'],
    city: 'Nowhere',
    stateOrProvince: 'ZZ',
    postalCode: '00000',
    country: 'US'
  });

  // Add generation hints
  builder.addGenerationHint({
    category: 'response_validation',
    hint: 'Always check responseCode first, then validate corresponding address fields based on the code',
    example: 'For VERIFIED: check validatedAddress is populated and requestAddressSanitized is null'
  });

  builder.addGenerationHint({
    category: 'data_format',
    hint: 'streets field must be an array of strings, even for single-line addresses',
    example: '{ "streets": ["123 Main St"], "city": "Anytown" }'
  });

  builder.addGenerationHint({
    category: 'assertion_pattern',
    hint: 'Use change flags (cityChanged, postalChanged, streetChanged, stateProvinceChanged) to verify corrections',
    example: 'When responseCode is CORRECTED and postal was empty, check postalChanged=true'
  });

  builder.addGenerationHint({
    category: 'test_naming',
    hint: 'Name tests descriptively: Verify [input condition] returns [expected response]',
    example: 'Verify valid address returns VERIFIED, Verify empty postal code gets CORRECTED'
  });

  builder.addGenerationHint({
    category: 'negative_testing',
    hint: 'For NOT_VERIFIED tests, use completely fake addresses or mismatched city/state/postal combinations',
    example: 'City=Los Angeles with stateOrProvince=NY should return NOT_VERIFIED'
  });

  return builder;
}

