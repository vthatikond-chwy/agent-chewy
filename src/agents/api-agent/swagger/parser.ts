/**
 * Swagger/OpenAPI specification parser
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions (inline for now, can be moved to types.ts later)
export interface SwaggerEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: any[];
}

export interface SwaggerParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: any;
  description?: string;
  example?: any;
}

export interface Schema {
  type?: string;
  properties?: any;
  required?: string[];
  items?: Schema;
  enum?: any[];
  format?: string;
  example?: any;
  $ref?: string;
}

export class SwaggerSpecParser {
  private spec: any;
  private api: any;

  /**
   * Load and parse Swagger/OpenAPI specification
   */
  async loadSpec(specPath: string): Promise<void> {
    try {
      // Validate and dereference the spec (resolves all $ref)
      this.api = await SwaggerParser.validate(specPath);
      this.spec = await SwaggerParser.dereference(specPath);
      
      console.log(`✅ Successfully loaded Swagger spec: ${this.getApiInfo().title}`);
    } catch (error: any) {
      throw new Error(`Failed to load Swagger spec: ${error.message}`);
    }
  }

  /**
   * Load spec from URL
   */
  async loadSpecFromUrl(url: string): Promise<void> {
    try {
      this.api = await SwaggerParser.validate(url);
      this.spec = await SwaggerParser.dereference(url);
      
      console.log(`✅ Successfully loaded Swagger spec from URL`);
    } catch (error: any) {
      throw new Error(`Failed to load Swagger spec from URL: ${error.message}`);
    }
  }

  /**
   * Get API information
   */
  getApiInfo(): { title: string; version: string; description?: string } {
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
  getBaseUrl(): string {
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
  getAllEndpoints(): SwaggerEndpoint[] {
    if (!this.spec) {
      throw new Error('Swagger spec not loaded');
    }

    const endpoints: SwaggerEndpoint[] = [];
    const paths = this.spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
      
      for (const method of methods) {
        const operation = (pathItem as any)[method];
        
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
  getEndpointsByTag(tag: string): SwaggerEndpoint[] {
    const allEndpoints = this.getAllEndpoints();
    return allEndpoints.filter(ep => ep.tags?.includes(tag));
  }

  /**
   * Get specific endpoint
   */
  getEndpoint(path: string, method: string): SwaggerEndpoint | undefined {
    const endpoints = this.getAllEndpoints();
    return endpoints.find(
      ep => ep.path === path && ep.method === method.toUpperCase()
    );
  }

  /**
   * Get all tags
   */
  getAllTags(): string[] {
    const endpoints = this.getAllEndpoints();
    const tags = new Set<string>();
    
    endpoints.forEach(ep => {
      ep.tags?.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags);
  }

  /**
   * Get security schemes
   */
  getSecuritySchemes(): Record<string, any> {
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
  getRequestBodySchema(endpoint: SwaggerEndpoint): Schema | null {
    if (!endpoint.requestBody) {
      return null;
    }

    const content = (endpoint.requestBody as any).content;
    if (!content) {
      return null;
    }

    // Try to get JSON content first
    const jsonContent = content['application/json'];
    if (jsonContent?.schema) {
      return jsonContent.schema;
    }

    // Try any other content type
    const firstContent = Object.values(content)[0] as any;
    return firstContent?.schema || null;
  }

  /**
   * Extract response schema
   */
  getResponseSchema(endpoint: SwaggerEndpoint, statusCode: string = '200'): Schema | null {
    const response = endpoint.responses?.[statusCode] as any;
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

    const firstContent = Object.values(content)[0] as any;
    return firstContent?.schema || null;
  }

  /**
   * Get required parameters
   */
  getRequiredParameters(endpoint: SwaggerEndpoint): {
    path: string[];
    query: string[];
    header: string[];
  } {
    const required = {
      path: [] as string[],
      query: [] as string[],
      header: [] as string[]
    };

    endpoint.parameters?.forEach(param => {
      if (param.required && param.in !== 'cookie') {
        const paramIn = param.in as 'path' | 'query' | 'header';
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
  private parseParameters(parameters: any[]): SwaggerParameter[] {
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
  getRawSpec(): any {
    return this.spec;
  }
}