/**
 * Swagger/OpenAPI specification parser
 */
import SwaggerParser from '@apidevtools/swagger-parser';
import { SwaggerEndpoint, SwaggerParameter, RequestBody, Response, Schema } from '../types';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
export class SwaggerSpecParser {
    spec;
    api;
    /**
     * Load and parse Swagger/OpenAPI specification
     */
    async loadSpec(specPath) {
        try {
            // Validate and dereference the spec (resolves all $ref)
            this.api = await SwaggerParser.validate(specPath);
            this.spec = await SwaggerParser.dereference(specPath);
            console.log(`✅ Successfully loaded Swagger spec: ${this.getApiInfo().title}`);
        }
        catch (error) {
            throw new Error(`Failed to load Swagger spec: ${error.message}`);
        }
    }
    /**
     * Load spec from URL
     */
    async loadSpecFromUrl(url) {
        try {
            this.api = await SwaggerParser.validate(url);
            this.spec = await SwaggerParser.dereference(url);
            console.log(`✅ Successfully loaded Swagger spec from URL`);
        }
        catch (error) {
            throw new Error(`Failed to load Swagger spec from URL: ${error.message}`);
        }
    }
    /**
     * Get API information
     */
    getApiInfo() {
        if (!this.spec) {
            throw new Error('Swagger spec not loaded');
        }
        return {
            title: this.spec.info?.title || 'Unknown API',
            version: this.spec.info?.version || '1.0.0',
            description: this.spec.info?.description
        };
    }
    /**
     * Get base URL from spec
     */
    getBaseUrl() {
        if (!this.spec) {
            throw new Error('Swagger spec not loaded');
        }
        // OpenAPI 3.0
        if (this.spec.servers && this.spec.servers.length > 0) {
            return this.spec.servers[0].url;
        }
        // Swagger 2.0
        const schemes = this.spec.schemes || ['https'];
        const host = this.spec.host || 'api.example.com';
        const basePath = this.spec.basePath || '';
        return `${schemes[0]}://${host}${basePath}`;
    }
    /**
     * Get all endpoints from the specification
     */
    getAllEndpoints() {
        if (!this.spec) {
            throw new Error('Swagger spec not loaded');
        }
        const endpoints = [];
        const paths = this.spec.paths || {};
        for (const [path, pathItem] of Object.entries(paths)) {
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            for (const method of methods) {
                const operation = pathItem[method];
                if (operation) {
                    endpoints.push({
                        path,
                        method: method.toUpperCase(),
                        operationId: operation.operationId,
                        summary: operation.summary,
                        description: operation.description,
                        tags: operation.tags || [],
                        parameters: this.parseParameters(operation.parameters || []),
                        requestBody: operation.requestBody,
                        responses: operation.responses || {},
                        security: operation.security || []
                    });
                }
            }
        }
        return endpoints;
    }
    /**
     * Get endpoints by tag
     */
    getEndpointsByTag(tag) {
        const allEndpoints = this.getAllEndpoints();
        return allEndpoints.filter(ep => ep.tags?.includes(tag));
    }
    /**
     * Get specific endpoint
     */
    getEndpoint(path, method) {
        const endpoints = this.getAllEndpoints();
        return endpoints.find(ep => ep.path === path && ep.method === method.toUpperCase());
    }
    /**
     * Get all tags
     */
    getAllTags() {
        const endpoints = this.getAllEndpoints();
        const tags = new Set();
        endpoints.forEach(ep => {
            ep.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }
    /**
     * Get security schemes
     */
    getSecuritySchemes() {
        if (!this.spec) {
            throw new Error('Swagger spec not loaded');
        }
        // OpenAPI 3.0
        if (this.spec.components?.securitySchemes) {
            return this.spec.components.securitySchemes;
        }
        // Swagger 2.0
        return this.spec.securityDefinitions || {};
    }
    /**
     * Extract request body schema
     */
    getRequestBodySchema(endpoint) {
        if (!endpoint.requestBody) {
            return null;
        }
        const content = endpoint.requestBody.content;
        if (!content) {
            return null;
        }
        // Try to get JSON content first
        const jsonContent = content['application/json'];
        if (jsonContent?.schema) {
            return jsonContent.schema;
        }
        // Try any other content type
        const firstContent = Object.values(content)[0];
        return firstContent?.schema || null;
    }
    /**
     * Extract response schema
     */
    getResponseSchema(endpoint, statusCode = '200') {
        const response = endpoint.responses?.[statusCode];
        if (!response) {
            return null;
        }
        const content = response.content;
        if (!content) {
            return null;
        }
        const jsonContent = content['application/json'];
        if (jsonContent?.schema) {
            return jsonContent.schema;
        }
        const firstContent = Object.values(content)[0];
        return firstContent?.schema || null;
    }
    /**
     * Get required parameters
     */
    getRequiredParameters(endpoint) {
        const required = {
            path: [],
            query: [],
            header: []
        };
        endpoint.parameters?.forEach(param => {
            if (param.required && param.in !== 'cookie') {
                const paramIn = param.in;
                if (required[paramIn]) {
                    required[paramIn].push(param.name);
                }
            }
        });
        return required;
    }
    /**
     * Parse parameters into standardized format
     */
    parseParameters(parameters) {
        return parameters.map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            schema: param.schema,
            description: param.description,
            example: param.example
        }));
    }
    /**
     * Get the raw spec object
     */
    getRawSpec() {
        return this.spec;
    }
}
//# sourceMappingURL=parser.js.map