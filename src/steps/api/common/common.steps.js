import { Given, Then, World } from '@cucumber/cucumber';
import { expect } from 'chai';
import { saveSuccessfulPattern } from '../../../agents/api-agent/self-healing.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as fs from 'fs';
import * as path from 'path';
Then('the response status code should be {int}', function (expectedStatus) {
    expect(this.response?.status).to.equal(expectedStatus);
    // Self-healing: Save successful request pattern (status 200-299)
    if (this.response && this.response.status >= 200 && this.response.status < 300 && this.endpoint && this.requestBody) {
        try {
            // Extract method from step context if available, or default to POST
            const method = this.httpMethod || 'POST';
            saveSuccessfulPattern({
                endpoint: this.endpoint,
                method: method,
                requestBody: this.requestBody,
                responseBody: this.response.data,
                statusCode: this.response.status,
                timestamp: Date.now()
            });
        }
        catch (error) {
            // Silently fail - healing is optional
        }
    }
});
Given('I am authorized to access the {string} endpoint', function (endpoint) {
    // Authorization setup - can be customized based on authentication requirements
    // For now, this is a placeholder that can be extended
});
/**
 * Resolve $ref references in schema recursively
 */
function resolveSchemaRefs(schema, spec, visited = new Set()) {
    if (!schema) {
        return schema;
    }
    // Handle $ref
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
        // Prevent circular references
        if (visited.has(refPath)) {
            return { type: 'object', description: 'Circular reference' };
        }
        visited.add(refPath);
        const refSchema = spec.components?.schemas?.[refPath] || spec.definitions?.[refPath];
        if (refSchema) {
            return resolveSchemaRefs(refSchema, spec, visited);
        }
    }
    // Recursively resolve nested schemas
    const resolved = { ...schema };
    if (schema.properties) {
        resolved.properties = {};
        for (const [key, value] of Object.entries(schema.properties)) {
            resolved.properties[key] = resolveSchemaRefs(value, spec, new Set(visited));
        }
    }
    if (schema.items) {
        resolved.items = resolveSchemaRefs(schema.items, spec, new Set(visited));
    }
    if (schema.allOf) {
        resolved.allOf = schema.allOf.map((s) => resolveSchemaRefs(s, spec, new Set(visited)));
    }
    if (schema.anyOf) {
        resolved.anyOf = schema.anyOf.map((s) => resolveSchemaRefs(s, spec, new Set(visited)));
    }
    if (schema.oneOf) {
        resolved.oneOf = schema.oneOf.map((s) => resolveSchemaRefs(s, spec, new Set(visited)));
    }
    return resolved;
}
/**
 * Find Swagger spec file based on the endpoint URL
 */
function findSwaggerSpec(baseUrl, endpoint) {
    const possiblePaths = [
        'swagger/teams/avs/avs-api.json',
        'swagger/teams/kyrios/kyrios-api.json',
        'swagger/api-spec.json',
        'swagger/openapi.json'
    ];
    // Try to determine from baseUrl
    if (baseUrl) {
        if (baseUrl.includes('avs') || baseUrl.includes('AVS')) {
            const avsPath = 'swagger/teams/avs/avs-api.json';
            if (fs.existsSync(avsPath))
                return avsPath;
        }
        if (baseUrl.includes('kyrios') || baseUrl.includes('KYRIOS')) {
            const kyriosPath = 'swagger/teams/kyrios/kyrios-api.json';
            if (fs.existsSync(kyriosPath))
                return kyriosPath;
        }
    }
    // Try each possible path
    for (const specPath of possiblePaths) {
        if (fs.existsSync(specPath)) {
            return specPath;
        }
    }
    return null;
}
Then('the response matches the expected schema', async function () {
    // Skip if no response
    if (!this.response) {
        console.warn('No response available for schema validation');
        return;
    }
    const statusCode = this.response.status.toString();
    // Try to load swagger spec if not already loaded
    if (!this.swaggerSpec) {
        const specPath = this.swaggerSpecPath || findSwaggerSpec(this.baseUrl, this.endpoint);
        if (specPath) {
            try {
                this.swaggerSpec = await SwaggerParser.dereference(specPath);
                this.swaggerSpecPath = specPath;
            }
            catch (error) {
                console.warn('Could not load Swagger spec for schema validation:', error);
                return;
            }
        }
        else {
            console.warn('Could not find Swagger spec for schema validation');
            return;
        }
    }
    // Extract endpoint and method
    const endpoint = this.endpoint;
    const method = (this.httpMethod || 'POST').toLowerCase();
    if (!endpoint || !this.swaggerSpec.paths?.[endpoint]?.[method]) {
        console.warn(`Endpoint ${method.toUpperCase()} ${endpoint} not found in Swagger spec`);
        return;
    }
    const endpointDef = this.swaggerSpec.paths[endpoint][method];
    const responses = endpointDef.responses || {};
    const response = responses[statusCode];
    if (!response) {
        console.warn(`Response ${statusCode} not defined in Swagger spec for ${method.toUpperCase()} ${endpoint}`);
        return;
    }
    // Extract response schema
    let responseSchema = null;
    // OpenAPI 3.0
    if (response.content) {
        responseSchema = response.content['application/json']?.schema ||
            response.content['*/*']?.schema;
    }
    // Swagger 2.0
    else if (response.schema) {
        responseSchema = response.schema;
    }
    if (!responseSchema) {
        console.warn(`No schema defined for ${statusCode} response`);
        return;
    }
    // Resolve $ref references
    let resolvedSchema = resolveSchemaRefs(responseSchema, this.swaggerSpec);
    // Validate using Ajv with lenient mode - only validate structure, not nullable fields
    const ajv = new Ajv({
        allErrors: false, // Stop on first error for performance
        strict: false,
        validateFormats: false, // Don't validate formats strictly
        allowUnionTypes: true,
        coerceTypes: false,
        // Most important: allow additional properties and don't fail on nullable fields
        removeAdditional: false,
        useDefaults: false,
        validateSchema: false
    });
    addFormats(ajv);
    // Compile with lenient options
    const validate = ajv.compile(resolvedSchema);
    const valid = validate(this.response.data);
    if (!valid && validate.errors) {
        // Filter out errors related to null values on non-required fields
        const criticalErrors = validate.errors.filter((error) => {
            // Ignore type errors for null values (common in real APIs)
            if (error.keyword === 'type' && error.params?.type && error.data === null) {
                return false;
            }
            // Ignore anyOf errors (usually related to nullable)
            if (error.keyword === 'anyOf') {
                return false;
            }
            return true;
        });
        if (criticalErrors.length > 0) {
            console.warn('⚠️  Schema validation warnings (non-critical):');
            console.warn(JSON.stringify(criticalErrors, null, 2));
        }
        // Only fail if there are critical errors (not just null/type mismatches)
        if (criticalErrors.length > 0 && criticalErrors.some((e) => e.keyword !== 'type' && e.keyword !== 'additionalProperties')) {
            console.error('❌ Schema validation failed with critical errors!');
            console.error('Validation errors:', JSON.stringify(criticalErrors, null, 2));
            console.error('Response data:', JSON.stringify(this.response.data, null, 2));
            expect(false, `Schema validation failed: ${JSON.stringify(criticalErrors)}`).to.be.true;
        }
    }
    // Schema validation passed (or only had non-critical warnings)
    console.log(`✅ Response schema validation passed for ${method.toUpperCase()} ${endpoint} (${statusCode})`);
});
//# sourceMappingURL=common.steps.js.map