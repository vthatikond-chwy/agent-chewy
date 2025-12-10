/**
 * Type definitions for API Context Library
 * Domain knowledge, patterns, and test generation context
 */

/**
 * Response code behavior - describes what happens with different response codes
 */
export interface ResponseCodeBehavior {
  code: string;
  description: string;
  validatedAddressState: 'populated' | 'null';
  sanitizedAddressState: 'populated' | 'null';
  triggers: string[];
  testScenarios: string[];
}

/**
 * Test data pattern - reusable test data for specific scenarios
 */
export interface TestDataPattern {
  name: string;
  description: string;
  endpoint: string;
  data: Record<string, any>;
  expectedResponseCode: string;
  expectedHttpStatus: number;
  assertions: string[];
}

/**
 * Assertion template - standardized assertions for response types
 */
export interface AssertionTemplate {
  responseCode: string;
  assertions: AssertionRule[];
}

export interface AssertionRule {
  field: string;
  condition: 'equals' | 'notNull' | 'isNull' | 'contains' | 'exists' | 'isArray';
  expectedValue?: any;
  description: string;
}

/**
 * Field validation rule
 */
export interface FieldValidation {
  field: string;
  type: string;
  required: boolean;
  format?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  example?: any;
  description?: string;
}

/**
 * Endpoint context - comprehensive context for an endpoint
 */
export interface EndpointContext {
  path: string;
  method: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  requestSchema: Record<string, FieldValidation>;
  responseCodeBehaviors: ResponseCodeBehavior[];
  testPatterns: TestDataPattern[];
  assertionTemplates: AssertionTemplate[];
  commonErrors: CommonError[];
}

/**
 * Common error patterns
 */
export interface CommonError {
  name: string;
  httpStatus: number;
  cause: string;
  testData: Record<string, any>;
  expectedResponse?: Record<string, any>;
}

/**
 * Domain context - high-level domain knowledge
 */
export interface DomainContext {
  serviceName: string;
  serviceDescription: string;
  businessRules: BusinessRule[];
  terminology: Record<string, string>;
  edgeCases: EdgeCase[];
  securityConsiderations: SecurityRule[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  testRecommendations: string[];
}

export interface EdgeCase {
  name: string;
  description: string;
  testData: Record<string, any>;
  expectedBehavior: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SecurityRule {
  name: string;
  description: string;
  testApproach: string;
}

/**
 * Complete API context - all context for an API
 */
export interface ApiContext {
  version: string;
  lastUpdated: string;
  team: string;
  domain: DomainContext;
  endpoints: EndpointContext[];
  globalTestData: {
    validAddresses: Record<string, any>[];
    invalidAddresses: Record<string, any>[];
    boundaryData: Record<string, any>[];
  };
  generationHints: GenerationHint[];
}

/**
 * Generation hint - guidance for LLM when generating tests
 */
export interface GenerationHint {
  category: string;
  hint: string;
  example?: string | undefined;
}

/**
 * Context loading result
 */
export interface ContextLoadResult {
  success: boolean;
  context?: ApiContext | undefined;
  error?: string | undefined;
}

