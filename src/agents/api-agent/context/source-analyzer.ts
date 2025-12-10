/**
 * Source Code Analyzer - Extracts context from service source code
 * Analyzes Java/TypeScript source to build rich domain context
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ApiContext, TestDataPattern, ResponseCodeBehavior, EdgeCase, BusinessRule } from './types.js';

export interface SourceAnalysisOptions {
  repoUrl: string;
  teamName: string;
  language?: 'java' | 'typescript' | 'auto';
  tempDir?: string;
  cleanup?: boolean;
}

export interface SourceAnalysisResult {
  success: boolean;
  context?: ApiContext;
  testAddresses?: {
    verified: any[];
    corrected: any[];
    notVerified: any[];
    streetPartial: any[];
    premisesPartial: any[];
  };
  businessRules?: BusinessRule[];
  error?: string;
}

export class SourceCodeAnalyzer {
  private tempDir: string;
  private repoDir: string = '';

  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), '.context-temp');
  }

  /**
   * Analyze source code from a GitHub repository
   */
  async analyzeFromRepo(options: SourceAnalysisOptions): Promise<SourceAnalysisResult> {
    console.log(`\n📂 Analyzing source code from: ${options.repoUrl}`);

    try {
      // Clone repository
      this.repoDir = await this.cloneRepo(options.repoUrl, options.teamName);
      console.log(`✅ Repository cloned to: ${this.repoDir}`);

      // Detect language
      const language = options.language === 'auto' || !options.language
        ? this.detectLanguage(this.repoDir)
        : options.language;
      console.log(`📝 Detected language: ${language}`);

      // Analyze based on language
      let result: SourceAnalysisResult;
      if (language === 'java') {
        result = await this.analyzeJavaSource(this.repoDir, options.teamName);
      } else {
        result = await this.analyzeTypeScriptSource(this.repoDir, options.teamName);
      }

      // Cleanup if requested
      if (options.cleanup !== false) {
        this.cleanup();
      }

      return result;

    } catch (error: any) {
      console.error('❌ Source analysis failed:', error.message);
      this.cleanup();
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clone a repository
   */
  private async cloneRepo(repoUrl: string, teamName: string): Promise<string> {
    const repoDir = path.join(this.tempDir, `${teamName}-source`);

    // Remove existing if present
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true });
    }

    // Create temp directory
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    console.log('📥 Cloning repository...');
    execSync(`git clone --depth 1 ${repoUrl} ${repoDir}`, { stdio: 'pipe' });

    return repoDir;
  }

  /**
   * Detect the primary language of the repository
   */
  private detectLanguage(repoDir: string): 'java' | 'typescript' {
    const hasJava = fs.existsSync(path.join(repoDir, 'src/main/java')) ||
                    fs.existsSync(path.join(repoDir, 'build.gradle')) ||
                    fs.existsSync(path.join(repoDir, 'pom.xml'));

    const hasTypeScript = fs.existsSync(path.join(repoDir, 'tsconfig.json')) ||
                          fs.existsSync(path.join(repoDir, 'package.json'));

    return hasJava ? 'java' : 'typescript';
  }

  /**
   * Analyze Java source code (like AVS service)
   */
  private async analyzeJavaSource(repoDir: string, teamName: string): Promise<SourceAnalysisResult> {
    console.log('🔍 Analyzing Java source code...');

    const result: SourceAnalysisResult = {
      success: true,
      testAddresses: {
        verified: [],
        corrected: [],
        notVerified: [],
        streetPartial: [],
        premisesPartial: []
      },
      businessRules: []
    };

    // Find test address files
    const testFiles = this.findFiles(repoDir, '**/AVSTestAddresses.java');
    for (const file of testFiles) {
      console.log(`   📄 Analyzing: ${path.basename(file)}`);
      const addresses = this.parseJavaTestAddresses(file);
      result.testAddresses = { ...result.testAddresses, ...addresses };
    }

    // Find response/model files for business rules
    const responseFiles = this.findFiles(repoDir, '**/AVSResponse.java');
    for (const file of responseFiles) {
      console.log(`   📄 Analyzing: ${path.basename(file)}`);
      const rules = this.parseJavaResponseLogic(file);
      result.businessRules?.push(...rules);
    }

    // Find controller files
    const controllerFiles = this.findFiles(repoDir, '**/*Controller.java');
    for (const file of controllerFiles) {
      console.log(`   📄 Analyzing: ${path.basename(file)}`);
      // Extract endpoint info, limits, etc.
    }

    // Build context from analysis
    result.context = this.buildContextFromAnalysis(teamName, result);

    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Verified addresses: ${result.testAddresses?.verified.length || 0}`);
    console.log(`   Corrected addresses: ${result.testAddresses?.corrected.length || 0}`);
    console.log(`   NOT_VERIFIED addresses: ${result.testAddresses?.notVerified.length || 0}`);
    console.log(`   Business rules: ${result.businessRules?.length || 0}`);

    return result;
  }

  /**
   * Parse Java test addresses file
   */
  private parseJavaTestAddresses(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: any = {
      verified: [],
      corrected: [],
      notVerified: [],
      streetPartial: [],
      premisesPartial: []
    };

    // Pattern to match AVSAddress constructor calls
    // new AVSAddress("street", "city", "state", "zip")
    // new AVSAddress("street", "street2", "city", "state", "zip")
    const addressPattern = /new\s+AVSAddress\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*,\s*"([^"]+)"\s*,\s*"?([^",)]+)"?\s*,\s*"?([^",)]*)"?\s*\)/g;

    // Find which list the addresses are being added to
    const lines = content.split('\n');
    let currentList = '';

    for (const line of lines) {
      // Detect which list we're adding to
      if (line.includes('verified.add') || line.includes('verified =')) {
        currentList = 'verified';
      } else if (line.includes('corrected.add') || line.includes('corrected =')) {
        currentList = 'corrected';
      } else if (line.includes('not_verified.add') || line.includes('not_verified =')) {
        currentList = 'notVerified';
      } else if (line.includes('street_partial.add') || line.includes('street_partial =')) {
        currentList = 'streetPartial';
      } else if (line.includes('premises_partial.add') || line.includes('premises_partial =')) {
        currentList = 'premisesPartial';
      }

      // Parse address from line
      const match = addressPattern.exec(line);
      if (match && currentList) {
        const address: any = {
          streets: [match[1]],
          country: 'US'
        };

        // Handle 4-arg vs 5-arg constructor
        if (match[2] && match[2].length > 2 && !['ma', 'ca', 'ny', 'fl', 'ga', 'nh', 'nd'].includes(match[2].toLowerCase())) {
          // 5-arg: street1, street2, city, state, zip
          address.streets.push(match[2]);
          address.city = match[3];
          address.stateOrProvince = match[4] === 'null' ? '' : match[4];
          address.postalCode = match[5] === 'null' ? '' : match[5];
        } else {
          // 4-arg: street, city, state, zip
          address.city = match[2] || match[3];
          address.stateOrProvince = match[3] === 'null' ? '' : (match[4] || match[3]);
          address.postalCode = match[4] === 'null' ? '' : (match[5] || match[4] || '');
        }

        // Clean up null strings
        if (address.stateOrProvince === 'null') address.stateOrProvince = '';
        if (address.postalCode === 'null') address.postalCode = '';

        result[currentList].push(address);
      }

      // Reset pattern lastIndex
      addressPattern.lastIndex = 0;
    }

    return result;
  }

  /**
   * Parse Java response logic for business rules
   */
  private parseJavaResponseLogic(filePath: string): BusinessRule[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules: BusinessRule[] = [];

    // Look for response code logic
    if (content.includes('ResponseCode.VERIFIED')) {
      rules.push({
        id: 'br_verified_logic',
        name: 'VERIFIED Response Logic',
        description: 'Address is verified when no significant corrections are needed. ZIP+4 addition and standardization do not trigger CORRECTED.',
        impact: 'high',
        testRecommendations: ['Test with complete valid address', 'Verify ZIP+4 addition still returns VERIFIED']
      });
    }

    if (content.includes('isCorrected = true')) {
      rules.push({
        id: 'br_corrected_triggers',
        name: 'CORRECTED Triggers',
        description: 'CORRECTED is triggered by: state changed, no postal code provided, ZIP first 5 digits changed, city changed (not standardized), street changed (not standardized).',
        impact: 'high',
        testRecommendations: ['Test with missing postal code', 'Test with wrong city', 'Test with missing state']
      });
    }

    if (content.includes('isPostalChanged()')) {
      rules.push({
        id: 'br_postal_change',
        name: 'Postal Code Change Detection',
        description: 'postalChanged flag is set when postal code differs between request and validated address.',
        impact: 'medium',
        testRecommendations: ['Test with empty postal code expecting postalChanged=true']
      });
    }

    return rules;
  }

  /**
   * Analyze TypeScript source code
   */
  private async analyzeTypeScriptSource(repoDir: string, teamName: string): Promise<SourceAnalysisResult> {
    console.log('🔍 Analyzing TypeScript source code...');

    // Similar logic for TypeScript projects
    return {
      success: true,
      testAddresses: { verified: [], corrected: [], notVerified: [], streetPartial: [], premisesPartial: [] },
      businessRules: []
    };
  }

  /**
   * Find files matching a pattern
   */
  private findFiles(dir: string, pattern: string): string[] {
    const results: string[] = [];
    const globPattern = pattern.replace('**/', '');

    const walkDir = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile() && file.match(globPattern.replace('*', '.*'))) {
          results.push(filePath);
        }
      }
    };

    walkDir(dir);
    return results;
  }

  /**
   * Build context from analysis results
   */
  private buildContextFromAnalysis(teamName: string, analysis: SourceAnalysisResult): ApiContext {
    const testPatterns: TestDataPattern[] = [];

    // Convert verified addresses to test patterns
    analysis.testAddresses?.verified.slice(0, 5).forEach((addr, idx) => {
      testPatterns.push({
        name: `Valid Address ${idx + 1} (from source)`,
        description: 'Known verified address from source test suite',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'VERIFIED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals VERIFIED', 'validatedAddress is not null']
      });
    });

    // Convert corrected addresses
    analysis.testAddresses?.corrected.slice(0, 3).forEach((addr, idx) => {
      testPatterns.push({
        name: `Corrected Address ${idx + 1} (from source)`,
        description: 'Address that gets corrected from source test suite',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'CORRECTED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals CORRECTED', 'validatedAddress is not null']
      });
    });

    // Convert not_verified addresses
    analysis.testAddresses?.notVerified.forEach((addr, idx) => {
      testPatterns.push({
        name: `Invalid Address ${idx + 1} (from source)`,
        description: 'Address that cannot be verified from source test suite',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'NOT_VERIFIED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals NOT_VERIFIED', 'validatedAddress is null', 'requestAddressSanitized is not null']
      });
    });

    return {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      team: teamName,
      domain: {
        serviceName: `${teamName.toUpperCase()} Service`,
        serviceDescription: `Auto-generated context from ${teamName} source code analysis`,
        businessRules: analysis.businessRules || [],
        terminology: {},
        edgeCases: [],
        securityConsiderations: []
      },
      endpoints: [{
        path: '/avs/v1.0/verifyAddress',
        method: 'POST',
        description: 'Address verification endpoint',
        requiredFields: ['streets'],
        optionalFields: ['city', 'stateOrProvince', 'postalCode', 'country'],
        requestSchema: {},
        responseCodeBehaviors: [
          { code: 'VERIFIED', description: 'Address valid', validatedAddressState: 'populated', sanitizedAddressState: 'null', triggers: ['Valid complete address'], testScenarios: [] },
          { code: 'CORRECTED', description: 'Address corrected', validatedAddressState: 'populated', sanitizedAddressState: 'null', triggers: ['Missing field corrected'], testScenarios: [] },
          { code: 'NOT_VERIFIED', description: 'Address invalid', validatedAddressState: 'null', sanitizedAddressState: 'populated', triggers: ['Invalid address'], testScenarios: [] }
        ],
        testPatterns,
        assertionTemplates: [],
        commonErrors: []
      }],
      globalTestData: {
        validAddresses: analysis.testAddresses?.verified || [],
        invalidAddresses: analysis.testAddresses?.notVerified || [],
        boundaryData: []
      },
      generationHints: []
    };
  }

  /**
   * Cleanup temporary files
   */
  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
      console.log('🧹 Cleaned up temporary files');
    }
  }

  /**
   * Save context to file
   */
  async saveContext(context: ApiContext, teamName: string): Promise<string> {
    const contextDir = path.join(process.cwd(), 'swagger', 'teams', teamName, 'context');

    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    const contextPath = path.join(contextDir, 'api-context.json');
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');

    console.log(`\n✅ Context saved to: ${contextPath}`);
    return contextPath;
  }
}

