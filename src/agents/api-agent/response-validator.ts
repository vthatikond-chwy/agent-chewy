/**
 * Validates responses against Swagger schema using Ajv
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationResult {
  valid: boolean;
  errors?: any[];
}

export class ResponseValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true
    });
    addFormats(this.ajv);
  }

  /**
   * Generate validation code for response schema
   * This generates TypeScript code that can be included in step definitions
   */
  generateValidation(responseSchema: any, statusCode: number, scenarioName: string): string {
    return `
Then('the response matches the expected schema for ${statusCode} in ${scenarioName}', function(this: CustomWorld) {
  const schema = ${JSON.stringify(responseSchema, null, 2)};
  const Ajv = require('ajv').default;
  const addFormats = require('ajv-formats').default;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(this.response?.data);

  if (!valid) {
    console.error('Schema validation errors:', validate.errors);
    console.error('Response data:', JSON.stringify(this.response?.data, null, 2));
  }

  expect(valid).to.be.true;
});
    `.trim();
  }

  /**
   * Validate response data against schema at runtime
   */
  validate(data: any, schema: any): ValidationResult {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid,
      errors: validate.errors || undefined
    };
  }

  /**
   * Resolve $ref references in schema
   */
  resolveSchema(schema: any, spec: any): any {
    if (!schema) {
      return schema;
    }

    // Handle $ref
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
      const refSchema = spec.components?.schemas?.[refPath] || spec.definitions?.[refPath];
      if (refSchema) {
        return this.resolveSchema(refSchema, spec);
      }
    }

    // Recursively resolve nested schemas
    if (schema.properties) {
      const resolved = { ...schema };
      resolved.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        resolved.properties[key] = this.resolveSchema(value, spec);
      }
      return resolved;
    }

    if (schema.items) {
      const resolved = { ...schema };
      resolved.items = this.resolveSchema(schema.items, spec);
      return resolved;
    }

    if (schema.allOf) {
      const resolved = { ...schema };
      resolved.allOf = schema.allOf.map((s: any) => this.resolveSchema(s, spec));
      return resolved;
    }

    if (schema.anyOf) {
      const resolved = { ...schema };
      resolved.anyOf = schema.anyOf.map((s: any) => this.resolveSchema(s, spec));
      return resolved;
    }

    if (schema.oneOf) {
      const resolved = { ...schema };
      resolved.oneOf = schema.oneOf.map((s: any) => this.resolveSchema(s, spec));
      return resolved;
    }

    return schema;
  }

  /**
   * Extract response schema from endpoint
   */
  extractResponseSchema(endpoint: any, statusCode: string, spec: any): any {
    const responses = endpoint.responses || {};
    const response = responses[statusCode];

    if (!response) {
      return null;
    }

    // OpenAPI 3.0
    if (response.content) {
      const schema = response.content['application/json']?.schema ||
                    response.content['*/*']?.schema;
      return schema ? this.resolveSchema(schema, spec) : null;
    }

    // Swagger 2.0
    if (response.schema) {
      return this.resolveSchema(response.schema, spec);
    }

    return null;
  }
}
