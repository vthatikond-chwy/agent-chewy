/**
 * Context Validator
 * 
 * Validates context library against real API responses to catch:
 * 1. Incorrect response code behaviors
 * 2. Test data that doesn't produce expected results
 * 3. Missing or incorrect assertions
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import type { ApiContext, TestDataPattern } from './types.js';

export interface ValidationResult {
  success: boolean;
  totalPatterns: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  pattern: string;
  field: string;
  expected: any;
  actual: any;
  message: string;
}

interface ValidationWarning {
  pattern: string;
  message: string;
}

export class ContextValidator {
  private baseUrl: string = 'https://avs.scff.stg.chewy.com';
  private results: ValidationResult = {
    success: true,
    totalPatterns: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    warnings: []
  };

  /**
   * Validate context for a team
   */
  async validate(teamName: string): Promise<ValidationResult> {
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 CONTEXT VALIDATION');
    console.log('═'.repeat(60));
    console.log(`\nTeam: ${teamName}`);

    // Load context
    const context = await this.loadContext(teamName);
    if (!context) {
      return {
        ...this.results,
        success: false,
        errors: [{ pattern: '', field: '', expected: '', actual: '', message: 'Failed to load context' }]
      };
    }

    // Load config for base URL
    await this.loadConfig(teamName);

    // Validate response code behaviors
    console.log('\n📋 Validating Response Code Behaviors...');
    await this.validateResponseCodeBehaviors(context);

    // Validate test patterns
    console.log('\n📋 Validating Test Patterns...');
    await this.validateTestPatterns(context);

    // Print summary
    this.printSummary();

    return this.results;
  }

  /**
   * Load context file
   */
  private async loadContext(teamName: string): Promise<ApiContext | null> {
    const contextPath = path.join(
      process.cwd(),
      'swagger/teams',
      teamName,
      'context/api-context.json'
    );

    if (!fs.existsSync(contextPath)) {
      console.error(`   ❌ Context file not found: ${contextPath}`);
      return null;
    }

    try {
      const content = fs.readFileSync(contextPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      console.error(`   ❌ Failed to parse context: ${error.message}`);
      return null;
    }
  }

  /**
   * Load config for base URL
   */
  private async loadConfig(teamName: string): Promise<void> {
    const configPath = path.join(
      process.cwd(),
      'swagger/teams',
      teamName,
      'config.json'
    );

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.baseUrl) {
          this.baseUrl = config.baseUrl;
        }
      } catch {
        // Use default base URL
      }
    }
    console.log(`   Base URL: ${this.baseUrl}`);
  }

  /**
   * Validate response code behaviors against real API
   */
  private async validateResponseCodeBehaviors(context: ApiContext): Promise<void> {
    const endpoint = context.endpoints?.[0];
    if (!endpoint?.responseCodeBehaviors) {
      console.log('   ⚠️  No response code behaviors to validate');
      return;
    }

    console.log(`   Found ${endpoint.responseCodeBehaviors.length} response code behaviors`);

    // For each response code, find a test pattern and validate
    for (const behavior of endpoint.responseCodeBehaviors) {
      const pattern = endpoint.testPatterns?.find(
        (p: TestDataPattern) => p.expectedResponseCode === behavior.code
      );

      if (!pattern) {
        this.results.warnings.push({
          pattern: behavior.code,
          message: `No test pattern found for response code ${behavior.code}`
        });
        console.log(`   ⚠️  ${behavior.code}: No test pattern available`);
        continue;
      }

      // Call API and validate
      try {
        const response = await this.callAPI(pattern.data, endpoint.path);
        
        // Check response code
        if (response.responseCode !== behavior.code) {
          this.addError(
            behavior.code,
            'responseCode',
            behavior.code,
            response.responseCode,
            `Expected ${behavior.code} but got ${response.responseCode}`
          );
        }

        // Check validatedAddress state
        const expectedValidated = behavior.validatedAddressState === 'populated';
        const actualValidated = response.validatedAddress !== null;
        
        if (expectedValidated !== actualValidated) {
          this.addError(
            behavior.code,
            'validatedAddress',
            behavior.validatedAddressState,
            actualValidated ? 'populated' : 'null',
            `validatedAddress expected ${behavior.validatedAddressState} but got ${actualValidated ? 'populated' : 'null'}`
          );
        } else {
          console.log(`   ✅ ${behavior.code}: Behavior matches API response`);
        }

      } catch (error: any) {
        this.addError(
          behavior.code,
          'api_call',
          'success',
          'error',
          `API call failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Validate test patterns against real API
   */
  private async validateTestPatterns(context: ApiContext): Promise<void> {
    const endpoint = context.endpoints?.[0];
    if (!endpoint?.testPatterns) {
      console.log('   ⚠️  No test patterns to validate');
      return;
    }

    // Limit to first 5 of each type to avoid too many API calls
    const patterns = this.selectRepresentativePatterns(endpoint.testPatterns);
    this.results.totalPatterns = patterns.length;

    console.log(`   Validating ${patterns.length} representative patterns...`);

    for (const pattern of patterns) {
      await this.validatePattern(pattern, endpoint.path);
    }
  }

  /**
   * Select representative patterns for validation
   */
  private selectRepresentativePatterns(patterns: TestDataPattern[]): TestDataPattern[] {
    const byCode: Map<string, TestDataPattern[]> = new Map();
    
    for (const pattern of patterns) {
      const code = pattern.expectedResponseCode;
      if (!byCode.has(code)) {
        byCode.set(code, []);
      }
      byCode.get(code)!.push(pattern);
    }

    const selected: TestDataPattern[] = [];
    for (const [code, codePatterns] of byCode) {
      // Take first 2 of each response code type
      selected.push(...codePatterns.slice(0, 2));
    }

    return selected;
  }

  /**
   * Validate a single test pattern
   */
  private async validatePattern(pattern: TestDataPattern, endpointPath: string): Promise<void> {
    const patternName = pattern.name.substring(0, 40);

    try {
      const response = await this.callAPI(pattern.data, endpointPath);

      // Check response code
      if (response.responseCode !== pattern.expectedResponseCode) {
        this.results.failed++;
        this.addError(
          pattern.name,
          'responseCode',
          pattern.expectedResponseCode,
          response.responseCode,
          `Expected ${pattern.expectedResponseCode} but got ${response.responseCode}`
        );
        console.log(`   ❌ ${patternName}...`);
        console.log(`      Expected: ${pattern.expectedResponseCode}, Got: ${response.responseCode}`);
      } else {
        this.results.passed++;
        console.log(`   ✅ ${patternName}... ${pattern.expectedResponseCode}`);
      }

    } catch (error: any) {
      this.results.failed++;
      this.addError(
        pattern.name,
        'api_call',
        'success',
        'error',
        `API call failed: ${error.message}`
      );
      console.log(`   ❌ ${patternName}... API Error`);
    }

    // Rate limit
    await this.sleep(100);
  }

  /**
   * Call the API
   */
  private async callAPI(data: any, endpointPath: string): Promise<any> {
    const url = `${this.baseUrl}${endpointPath}`;
    
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return response.data;
  }

  /**
   * Add error to results
   */
  private addError(pattern: string, field: string, expected: any, actual: any, message: string): void {
    this.results.success = false;
    this.results.errors.push({ pattern, field, expected, actual, message });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print summary
   */
  private printSummary(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\n   Total Patterns:  ${this.results.totalPatterns}`);
    console.log(`   ✅ Passed:       ${this.results.passed}`);
    console.log(`   ❌ Failed:       ${this.results.failed}`);
    console.log(`   ⚠️  Warnings:     ${this.results.warnings.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.results.errors) {
        console.log(`   • ${error.pattern}`);
        console.log(`     ${error.message}`);
      }
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      for (const warning of this.results.warnings) {
        console.log(`   • ${warning.pattern}: ${warning.message}`);
      }
    }

    console.log('\n' + (this.results.success ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'));
  }

  /**
   * Fix context based on validation results
   */
  async fixContext(teamName: string): Promise<void> {
    console.log('\n🔧 AUTO-FIXING CONTEXT...');

    const contextPath = path.join(
      process.cwd(),
      'swagger/teams',
      teamName,
      'context/api-context.json'
    );

    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let fixed = false;

    // Fix response code behaviors based on errors
    for (const error of this.results.errors) {
      if (error.field === 'validatedAddress') {
        const behavior = context.endpoints?.[0]?.responseCodeBehaviors?.find(
          (b: any) => b.code === error.pattern
        );
        if (behavior) {
          console.log(`   Fixing ${error.pattern}: validatedAddressState = ${error.actual}`);
          behavior.validatedAddressState = error.actual;
          fixed = true;
        }
      }
    }

    if (fixed) {
      context.lastUpdated = new Date().toISOString();
      fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
      console.log('   ✅ Context file updated');
    } else {
      console.log('   No automatic fixes applied');
    }
  }
}

