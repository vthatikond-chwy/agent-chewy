/**
 * Schema analyzer to extract minimal required fields and simplify complex schemas
 */

export interface SimplifiedSchema {
  requiredFields: string[];
  optionalFields: string[];
  flatStructure: boolean;
  responseType: 'object' | 'integer' | 'string' | 'array' | 'unknown';
  example: any;
}

/**
 * Analyze and simplify a Swagger schema
 * Extracts only essential fields and determines if structure should be flat
 */
export function analyzeSchema(schema: any, spec: any): SimplifiedSchema {
  if (!schema) {
    return {
      requiredFields: [],
      optionalFields: [],
      flatStructure: true,
      responseType: 'unknown',
      example: {}
    };
  }

  // Handle $ref references - support both OpenAPI 3.0 and Swagger 2.0
  if (schema.$ref) {
    // OpenAPI 3.0: #/components/schemas/AVSAddress
    // Swagger 2.0: #/definitions/AVSAddress
    let refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
    let refSchema = spec.components?.schemas?.[refPath] || spec.definitions?.[refPath];
    if (refSchema) {
      return analyzeSchema(refSchema, spec);
    }
  }

  // Handle response schema - check if it's a simple type
  if (schema.type === 'integer' || schema.type === 'string') {
    return {
      requiredFields: [],
      optionalFields: [],
      flatStructure: true,
      responseType: schema.type,
      example: schema.type === 'integer' ? 12345 : 'example'
    };
  }

  // Handle object schemas
  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    // Extract top-level fields only (flatten structure)
    const requiredFields: string[] = [];
    const optionalFields: string[] = [];
    
    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any;
      
      // Handle array types (like streets: [string])
      if (prop.type === 'array' && prop.items) {
        // Arrays are required if in required list, but we'll handle them specially
        if (required.includes(key)) {
          requiredFields.push(key);
        } else {
          optionalFields.push(key);
        }
      }
      // Skip complex nested objects/arrays for initial request
      // Only include simple types and top-level fields
      else if (prop.type && ['string', 'integer', 'number', 'boolean'].includes(prop.type)) {
        if (required.includes(key)) {
          requiredFields.push(key);
        } else {
          optionalFields.push(key);
        }
      } else if (!prop.type || prop.type === 'object') {
        // Complex nested structure - mark as optional for now
        optionalFields.push(key);
      }
    }

    // Build example with required fields
    const example: any = {};
    requiredFields.forEach(field => {
      const prop = properties[field] as any;
      if (prop.type === 'array' && prop.items) {
        // For arrays, provide a single-item array example
        example[field] = prop.items.type === 'string' ? ['example'] : [prop.items.example || 'example'];
      } else if (prop.type === 'string') {
        example[field] = prop.example || 'example';
      } else if (prop.type === 'integer' || prop.type === 'number') {
        example[field] = prop.example || 123;
      } else if (prop.type === 'boolean') {
        example[field] = prop.example || true;
      }
    });

    return {
      requiredFields,
      optionalFields,
      flatStructure: true, // Prefer flat structure
      responseType: 'object',
      example
    };
  }

  return {
    requiredFields: [],
    optionalFields: [],
    flatStructure: true,
    responseType: 'unknown',
    example: {}
  };
}

/**
 * Extract minimal request body structure from schema
 */
export function getMinimalRequestBody(schema: any, spec: any): any {
  const analyzed = analyzeSchema(schema, spec);
  return analyzed.example;
}

/**
 * Get response type description for assertions
 */
export function getResponseTypeDescription(schema: any, spec: any): string {
  const analyzed = analyzeSchema(schema, spec);
  
  if (analyzed.responseType === 'integer') {
    return 'The API returns just the user ID as an integer (number), not an object with properties.';
  } else if (analyzed.responseType === 'string') {
    return 'The API returns a string value, not an object.';
  } else if (analyzed.responseType === 'object') {
    return 'The API returns an object with properties.';
  }
  
  return 'The API response structure should be verified from the actual response.';
}

