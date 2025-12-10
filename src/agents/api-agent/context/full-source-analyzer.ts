/**
 * Full Source Code Analyzer - Comprehensive analysis of service source code
 * Extracts ALL test data, business rules, edge cases, and configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ApiContext, TestDataPattern, ResponseCodeBehavior, EdgeCase, BusinessRule, GenerationHint } from './types.js';

export interface FullAnalysisResult {
  success: boolean;
  context?: ApiContext;
  stats: {
    filesAnalyzed: number;
    testFilesFound: number;
    verifiedAddresses: number;
    correctedAddresses: number;
    notVerifiedAddresses: number;
    streetPartialAddresses: number;
    premisesPartialAddresses: number;
    businessRules: number;
    edgeCases: number;
    configValues: number;
  };
  error?: string;
}

export class FullSourceAnalyzer {
  private tempDir: string;
  private repoDir: string = '';
  private allTestData: Map<string, any[]> = new Map();
  private testFilesAnalyzedCount: number = 0;
  private businessRules: BusinessRule[] = [];
  private edgeCases: EdgeCase[] = [];
  private configValues: Map<string, any> = new Map();
  private responseCodeLogic: string[] = [];
  private generationHints: GenerationHint[] = [];

  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), '.context-temp');
  }

  /**
   * Full analysis from GitHub repository
   */
  async analyzeFullRepo(repoUrl: string, teamName: string): Promise<FullAnalysisResult> {
    console.log('\n' + '='.repeat(60));
    console.log('🔬 FULL SOURCE CODE ANALYSIS');
    console.log('='.repeat(60));
    console.log(`\nRepository: ${repoUrl}`);
    console.log(`Team: ${teamName}\n`);

    try {
      // Clone repository
      this.repoDir = await this.cloneRepo(repoUrl, teamName);

      // Reset state
      this.testFilesAnalyzedCount = 0;
      this.allTestData = new Map([
        ['verified', []],
        ['corrected', []],
        ['notVerified', []],
        ['streetPartial', []],
        ['premisesPartial', []]
      ]);
      this.businessRules = [];
      this.edgeCases = [];
      this.configValues = new Map();
      this.responseCodeLogic = [];
      this.generationHints = [];

      // Phase 1: Analyze ALL test files
      console.log('\n📋 PHASE 1: Analyzing Test Files');
      console.log('-'.repeat(40));
      await this.analyzeAllTestFiles();

      // Phase 2: Analyze source code for business logic
      console.log('\n📋 PHASE 2: Analyzing Business Logic');
      console.log('-'.repeat(40));
      await this.analyzeBusinessLogic();

      // Phase 3: Extract configuration
      console.log('\n📋 PHASE 3: Extracting Configuration');
      console.log('-'.repeat(40));
      await this.extractConfiguration();

      // Phase 4: Parse comments and documentation
      console.log('\n📋 PHASE 4: Extracting Documentation');
      console.log('-'.repeat(40));
      await this.extractDocumentation();

      // Phase 5: Build context
      console.log('\n📋 PHASE 5: Building Context Library');
      console.log('-'.repeat(40));
      const context = this.buildFullContext(teamName);

      // Calculate stats BEFORE cleanup (repo still exists)
      const filesAnalyzed = this.countFiles(this.repoDir);
      
      const stats = {
        filesAnalyzed,
        testFilesFound: this.testFilesAnalyzedCount,
        verifiedAddresses: this.allTestData.get('verified')?.length || 0,
        correctedAddresses: this.allTestData.get('corrected')?.length || 0,
        notVerifiedAddresses: this.allTestData.get('notVerified')?.length || 0,
        streetPartialAddresses: this.allTestData.get('streetPartial')?.length || 0,
        premisesPartialAddresses: this.allTestData.get('premisesPartial')?.length || 0,
        businessRules: this.businessRules.length,
        edgeCases: this.edgeCases.length,
        configValues: this.configValues.size
      };

      this.printSummary(stats);

      // Cleanup AFTER stats calculation
      this.cleanup();

      return { success: true, context, stats };

    } catch (error: any) {
      this.cleanup();
      return { success: false, error: error.message, stats: this.emptyStats() };
    }
  }

  /**
   * Clone repository
   */
  private async cloneRepo(repoUrl: string, teamName: string): Promise<string> {
    const repoDir = path.join(this.tempDir, `${teamName}-full-analysis`);

    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    console.log('📥 Cloning repository (full)...');
    execSync(`git clone ${repoUrl} ${repoDir}`, { stdio: 'pipe' });
    console.log('✅ Repository cloned\n');

    return repoDir;
  }

  /**
   * Analyze ALL test files in the repository
   */
  private async analyzeAllTestFiles(): Promise<void> {
    const testDirs = [
      path.join(this.repoDir, 'src/test'),
      path.join(this.repoDir, 'test'),
      path.join(this.repoDir, 'tests')
    ];

    for (const testDir of testDirs) {
      if (fs.existsSync(testDir)) {
        await this.scanDirectoryForTests(testDir);
      }
    }
  }

  /**
   * Recursively scan directory for test files
   */
  private async scanDirectoryForTests(dir: string): Promise<void> {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.')) {
        await this.scanDirectoryForTests(filePath);
      } else if (file.endsWith('.java') || file.endsWith('.ts') || file.endsWith('.js')) {
        await this.analyzeTestFile(filePath);
      }
    }
  }

  /**
   * Analyze a single test file
   */
  private async analyzeTestFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Skip non-test files
    if (!this.isTestFile(content, fileName)) {
      return;
    }

    this.testFilesAnalyzedCount++;
    console.log(`   📄 ${fileName}`);

    // Extract test addresses
    this.extractTestAddresses(content, fileName);

    // Extract test methods and their assertions
    this.extractTestAssertions(content, fileName);

    // Extract edge cases from test comments
    this.extractEdgeCasesFromTests(content, fileName);
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(content: string, fileName: string): boolean {
    return fileName.includes('Test') ||
           fileName.includes('Spec') ||
           content.includes('@Test') ||
           content.includes('describe(') ||
           content.includes('it(') ||
           content.includes('test(');
  }

  /**
   * Extract test addresses from various patterns
   */
  private extractTestAddresses(content: string, fileName: string): void {
    // Pattern 1: AVSAddress constructor (Java)
    this.extractJavaAddresses(content);

    // Pattern 2: JSON test data
    this.extractJsonTestData(content);

    // Pattern 3: Object literals (TypeScript/JavaScript)
    this.extractObjectLiterals(content);
  }

  /**
   * Extract Java AVSAddress objects
   */
  private extractJavaAddresses(content: string): void {
    const lines = content.split('\n');
    let currentCategory = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      const lineLower = line.toLowerCase();

      // Detect category (case-insensitive matching)
      if (/not.?verified/i.test(line) && (line.includes('.add') || line.includes('='))) {
        currentCategory = 'notVerified';
      } else if (/street.?partial/i.test(line) && (line.includes('.add') || line.includes('='))) {
        currentCategory = 'streetPartial';
      } else if (/premises.?partial/i.test(line) && (line.includes('.add') || line.includes('='))) {
        currentCategory = 'premisesPartial';
      } else if (lineLower.includes('corrected') && (line.includes('.add') || line.includes('='))) {
        currentCategory = 'corrected';
      } else if (lineLower.includes('verified') && !/not.?verified/i.test(line) && (line.includes('.add') || line.includes('='))) {
        currentCategory = 'verified';
      }

      // Parse AVSAddress constructor
      const addressMatch = line.match(/new\s+AVSAddress\s*\((.*?)\)/);
      if (addressMatch && currentCategory) {
        const address = this.parseAddressConstructor(addressMatch[1] || '', lines[i - 1] || '');
        if (address) {
          const list = this.allTestData.get(currentCategory) || [];
          list.push(address);
          this.allTestData.set(currentCategory, list);
        }
      }
    }
  }

  /**
   * Parse AVSAddress constructor arguments
   */
  private parseAddressConstructor(argsString: string, commentLine: string): any {
    // Remove quotes and split by comma
    const args = argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      if (trimmed === 'null') return '';
      return trimmed.replace(/^["']|["']$/g, '');
    });

    if (args.length < 4) return null;

    // Check if 4-arg or 5-arg constructor
    const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
    
    let address: any;
    if (args.length >= 5 && !states.includes(args[1].toUpperCase())) {
      // 5-arg: street1, street2, city, state, zip
      address = {
        streets: [args[0], args[1]].filter(s => s),
        city: args[2],
        stateOrProvince: args[3],
        postalCode: args[4] || '',
        country: 'US'
      };
    } else {
      // 4-arg: street, city, state, zip
      address = {
        streets: [args[0]],
        city: args[1],
        stateOrProvince: args[2],
        postalCode: args[3] || '',
        country: 'US'
      };
    }

    // Extract comment as note
    const commentMatch = commentLine.match(/\/\/\s*(.+)/);
    if (commentMatch) {
      address.note = commentMatch[1].trim();
    }

    return address;
  }

  /**
   * Extract JSON test data
   */
  private extractJsonTestData(content: string): void {
    // Look for JSON objects with address fields
    const jsonPattern = /\{\s*"streets"\s*:\s*\[.*?\].*?\}/gs;
    const matches = content.matchAll(jsonPattern);

    for (const match of matches) {
      try {
        const data = JSON.parse(match[0]);
        if (data.streets) {
          const list = this.allTestData.get('verified') || [];
          list.push(data);
          this.allTestData.set('verified', list);
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  /**
   * Extract object literals (TypeScript/JavaScript)
   */
  private extractObjectLiterals(content: string): void {
    const objectPattern = /\{\s*streets\s*:\s*\[.*?\].*?\}/gs;
    const matches = content.matchAll(objectPattern);

    for (const match of matches) {
      try {
        // Convert to JSON and parse
        const jsonStr = match[0]
          .replace(/(\w+):/g, '"$1":')
          .replace(/'/g, '"');
        const data = JSON.parse(jsonStr);
        if (data.streets) {
          const list = this.allTestData.get('verified') || [];
          list.push(data);
          this.allTestData.set('verified', list);
        }
      } catch {
        // Invalid, skip
      }
    }
  }

  /**
   * Extract test assertions to understand expected behaviors
   */
  private extractTestAssertions(content: string, fileName: string): void {
    // Pattern: assertEquals/expect statements
    const assertPatterns = [
      /assertEquals\s*\(\s*"?(\w+)"?\s*,\s*.*?\.getResponseCode\(\)/g,
      /expect\(.*?responseCode.*?\).*?(?:toBe|toEqual)\s*\(\s*['"](\w+)['"]\s*\)/g,
      /assertThat\(.*?getResponseCode.*?\).*?is\s*\(\s*(\w+)\s*\)/g
    ];

    for (const pattern of assertPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const expectedCode = match[1];
        if (['VERIFIED', 'CORRECTED', 'NOT_VERIFIED', 'STREET_PARTIAL', 'PREMISES_PARTIAL'].includes(expectedCode)) {
          // Found an expected response code in a test
          this.generationHints.push({
            category: 'test_assertion',
            hint: `Test in ${fileName} expects ${expectedCode} response`,
            example: match[0].substring(0, 80)
          });
        }
      }
    }
  }

  /**
   * Extract edge cases from test comments
   */
  private extractEdgeCasesFromTests(content: string, fileName: string): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for comments describing edge cases
      const commentMatch = line.match(/\/\/\s*(.+)/);
      if (commentMatch) {
        const comment = commentMatch[1].toLowerCase();

        // Detect edge case indicators
        if (comment.includes('edge case') ||
            comment.includes('special') ||
            comment.includes('handle') ||
            comment.includes('when') ||
            comment.includes('if')) {

          // Look for test data in next few lines
          const context = lines.slice(i, i + 5).join('\n');
          const addressMatch = context.match(/new\s+AVSAddress\s*\((.*?)\)/);

          if (addressMatch) {
            const address = this.parseAddressConstructor(addressMatch[1], '');
            if (address) {
              this.edgeCases.push({
                name: commentMatch[1].substring(0, 50),
                description: commentMatch[1],
                testData: address,
                expectedBehavior: this.inferExpectedBehavior(context),
                priority: 'medium'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Infer expected behavior from context
   */
  private inferExpectedBehavior(context: string): string {
    if (context.includes('VERIFIED')) return 'VERIFIED';
    if (context.includes('CORRECTED')) return 'CORRECTED';
    if (context.includes('NOT_VERIFIED')) return 'NOT_VERIFIED';
    if (context.includes('STREET_PARTIAL')) return 'STREET_PARTIAL';
    if (context.includes('PREMISES_PARTIAL')) return 'PREMISES_PARTIAL';
    return 'Unknown';
  }

  /**
   * Analyze business logic in source files
   */
  private async analyzeBusinessLogic(): Promise<void> {
    const srcDirs = [
      path.join(this.repoDir, 'src/main/java'),
      path.join(this.repoDir, 'src'),
      path.join(this.repoDir, 'lib')
    ];

    for (const srcDir of srcDirs) {
      if (fs.existsSync(srcDir)) {
        await this.scanDirectoryForLogic(srcDir);
      }
    }
  }

  /**
   * Scan directory for business logic
   */
  private async scanDirectoryForLogic(dir: string): Promise<void> {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        await this.scanDirectoryForLogic(filePath);
      } else if (file.endsWith('.java') || file.endsWith('.ts')) {
        await this.analyzeSourceFile(filePath);
      }
    }
  }

  /**
   * Analyze a source file for business logic
   */
  private async analyzeSourceFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Look for response code logic
    if (content.includes('ResponseCode') || content.includes('responseCode')) {
      console.log(`   📄 ${fileName} (response logic)`);
      this.extractResponseCodeLogic(content, fileName);
    }

    // Look for validation logic
    if (content.includes('validate') || content.includes('Validate')) {
      this.extractValidationRules(content, fileName);
    }

    // Look for error handling
    if (content.includes('Exception') || content.includes('throw')) {
      this.extractErrorPatterns(content, fileName);
    }
  }

  /**
   * Extract response code logic
   */
  private extractResponseCodeLogic(content: string, fileName: string): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Find conditions that set response codes
      if (line.includes('isCorrected = true') || line.includes('isCorrected=true')) {
        const context = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
        this.responseCodeLogic.push(context);

        // Extract the condition
        const conditionMatch = context.match(/if\s*\((.*?)\)/);
        if (conditionMatch) {
          this.businessRules.push({
            id: `br_corrected_${this.businessRules.length}`,
            name: `CORRECTED Trigger: ${this.summarizeCondition(conditionMatch[1])}`,
            description: `When ${conditionMatch[1].trim()}, response becomes CORRECTED`,
            impact: 'high',
            testRecommendations: [`Test condition: ${conditionMatch[1].trim()}`]
          });
        }
      }

      // Find responseCode assignments
      if (line.includes('responseCode = ResponseCode.')) {
        const codeMatch = line.match(/ResponseCode\.(\w+)/);
        if (codeMatch) {
          const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
          this.generationHints.push({
            category: 'response_code_assignment',
            hint: `${codeMatch[1]} is assigned in ${fileName}`,
            example: context.substring(0, 100)
          });
        }
      }
    }
  }

  /**
   * Summarize a condition for readability
   */
  private summarizeCondition(condition: string): string {
    if (condition.includes('StateProvince')) return 'State Changed';
    if (condition.includes('PostalCode')) return 'Postal Code Changed';
    if (condition.includes('City')) return 'City Changed';
    if (condition.includes('Street')) return 'Street Changed';
    return condition.substring(0, 30);
  }

  /**
   * Extract validation rules
   */
  private extractValidationRules(content: string, fileName: string): void {
    // Look for validation patterns
    const validationPatterns = [
      /if\s*\(\s*(\w+)\s*==\s*null/g,
      /if\s*\(\s*(\w+)\.isEmpty\(\)/g,
      /required\s*=\s*true/g
    ];

    for (const pattern of validationPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        this.generationHints.push({
          category: 'validation',
          hint: `Validation in ${fileName}: ${match[0]}`,
          example: match[0]
        });
      }
    }
  }

  /**
   * Extract error patterns
   */
  private extractErrorPatterns(content: string, fileName: string): void {
    const errorPatterns = [
      /throw\s+new\s+(\w+Exception)\s*\(\s*"([^"]+)"/g,
      /throw\s+new\s+(\w+Error)\s*\(\s*"([^"]+)"/g
    ];

    for (const pattern of errorPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        this.businessRules.push({
          id: `br_error_${this.businessRules.length}`,
          name: `Error: ${match[1]}`,
          description: match[2],
          impact: 'high',
          testRecommendations: [`Test error condition: ${match[2]}`]
        });
      }
    }
  }

  /**
   * Extract configuration values
   */
  private async extractConfiguration(): Promise<void> {
    const configFiles = [
      'application.yml',
      'application.yaml',
      'application.properties',
      'config.json',
      'config.yaml'
    ];

    for (const configFile of configFiles) {
      const configPath = this.findFile(this.repoDir, configFile);
      if (configPath) {
        console.log(`   📄 ${configFile}`);
        this.parseConfigFile(configPath);
      }
    }
  }

  /**
   * Find a file in directory tree
   */
  private findFile(dir: string, fileName: string): string | null {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        const found = this.findFile(filePath, fileName);
        if (found) return found;
      } else if (file === fileName) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Parse configuration file
   */
  private parseConfigFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    if (fileName.endsWith('.properties')) {
      // Parse properties file
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^([^=#]+)=(.+)$/);
        if (match) {
          this.configValues.set(match[1].trim(), match[2].trim());
        }
      }
    } else if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
      // Simple YAML parsing for key-value pairs
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\s*)(\w+):\s*(.+)$/);
        if (match && match[3] && !match[3].startsWith('#')) {
          this.configValues.set(match[2], match[3]);
        }
      }
    }
  }

  /**
   * Extract documentation from comments
   */
  private async extractDocumentation(): Promise<void> {
    // Find README files
    const readmeFiles = ['README.md', 'README.txt', 'readme.md'];
    for (const readme of readmeFiles) {
      const readmePath = path.join(this.repoDir, readme);
      if (fs.existsSync(readmePath)) {
        console.log(`   📄 ${readme}`);
        this.parseReadme(readmePath);
      }
    }
  }

  /**
   * Parse README for API documentation
   */
  private parseReadme(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract API endpoint documentation
    const endpointPattern = /(?:POST|GET|PUT|DELETE)\s+([\/\w]+)/g;
    const matches = content.matchAll(endpointPattern);

    for (const match of matches) {
      this.generationHints.push({
        category: 'documentation',
        hint: `Endpoint documented in README: ${match[0]}`,
        example: match[0]
      });
    }
  }

  /**
   * Build the full context from all extracted data
   */
  private buildFullContext(teamName: string): ApiContext {
    // Build test patterns from all categories
    const testPatterns: TestDataPattern[] = [];

    // Verified addresses
    (this.allTestData.get('verified') || []).forEach((addr, idx) => {
      testPatterns.push({
        name: `Verified Address ${idx + 1}${addr.note ? ` - ${addr.note}` : ''}`,
        description: addr.note || 'Known verified address from source tests',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'VERIFIED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals VERIFIED', 'validatedAddress is not null', 'requestAddressSanitized is null']
      });
    });

    // Corrected addresses
    (this.allTestData.get('corrected') || []).forEach((addr, idx) => {
      testPatterns.push({
        name: `Corrected Address ${idx + 1}${addr.note ? ` - ${addr.note}` : ''}`,
        description: addr.note || 'Address that gets corrected',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'CORRECTED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals CORRECTED', 'validatedAddress is not null']
      });
    });

    // NOT_VERIFIED addresses
    (this.allTestData.get('notVerified') || []).forEach((addr, idx) => {
      testPatterns.push({
        name: `Invalid Address ${idx + 1}${addr.note ? ` - ${addr.note}` : ''}`,
        description: addr.note || 'Address that cannot be verified',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'NOT_VERIFIED',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals NOT_VERIFIED', 'validatedAddress is null', 'requestAddressSanitized is not null']
      });
    });

    // STREET_PARTIAL addresses
    (this.allTestData.get('streetPartial') || []).forEach((addr, idx) => {
      testPatterns.push({
        name: `Street Partial ${idx + 1}${addr.note ? ` - ${addr.note}` : ''}`,
        description: addr.note || 'Street name only verified',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'STREET_PARTIAL',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals STREET_PARTIAL', 'validatedAddress is null']
      });
    });

    // PREMISES_PARTIAL addresses
    (this.allTestData.get('premisesPartial') || []).forEach((addr, idx) => {
      testPatterns.push({
        name: `Premises Partial ${idx + 1}${addr.note ? ` - ${addr.note}` : ''}`,
        description: addr.note || 'Partial premises verification',
        endpoint: '/avs/v1.0/verifyAddress',
        data: addr,
        expectedResponseCode: 'PREMISES_PARTIAL',
        expectedHttpStatus: 200,
        assertions: ['responseCode equals PREMISES_PARTIAL', 'validatedAddress is not null']
      });
    });

    // Build response code behaviors
    const responseCodeBehaviors: ResponseCodeBehavior[] = [
      {
        code: 'VERIFIED',
        description: 'Address is valid and complete',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: ['Valid complete address', 'ZIP+4 addition only', 'City/street standardization'],
        testScenarios: ['Verify valid address', 'Test ZIP+4 still returns VERIFIED']
      },
      {
        code: 'CORRECTED',
        description: 'Address valid but fields were corrected',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: this.businessRules
          .filter(r => r.name.includes('CORRECTED'))
          .map(r => r.description.substring(0, 50)),
        testScenarios: ['Test missing postal', 'Test wrong city']
      },
      {
        code: 'NOT_VERIFIED',
        description: 'Address cannot be verified',
        validatedAddressState: 'null',
        sanitizedAddressState: 'populated',
        triggers: ['Invalid address', 'Wrong state', 'Fake address'],
        testScenarios: ['Test fake address', 'Test mismatched city/state']
      },
      {
        code: 'STREET_PARTIAL',
        description: 'Only street name verified',
        validatedAddressState: 'null',
        sanitizedAddressState: 'populated',
        triggers: ['Street name without number'],
        testScenarios: ['Test street without number']
      },
      {
        code: 'PREMISES_PARTIAL',
        description: 'Partial premises verification',
        validatedAddressState: 'populated',
        sanitizedAddressState: 'null',
        triggers: ['Wrong unit number'],
        testScenarios: ['Test wrong apartment number']
      }
    ];

    return {
      version: '3.0.0',
      lastUpdated: new Date().toISOString(),
      team: teamName,
      domain: {
        serviceName: `${teamName.toUpperCase()} Service`,
        serviceDescription: `Comprehensive context from full source code analysis`,
        businessRules: this.businessRules,
        terminology: {},
        edgeCases: this.edgeCases,
        securityConsiderations: []
      },
      endpoints: [{
        path: '/avs/v1.0/verifyAddress',
        method: 'POST',
        description: 'Address verification endpoint',
        requiredFields: ['streets'],
        optionalFields: ['city', 'stateOrProvince', 'postalCode', 'country'],
        requestSchema: {},
        responseCodeBehaviors,
        testPatterns,
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
            responseCode: 'NOT_VERIFIED',
            assertions: [
              { field: 'responseCode', condition: 'equals', expectedValue: 'NOT_VERIFIED', description: 'Response code should be NOT_VERIFIED' },
              { field: 'validatedAddress', condition: 'isNull', description: 'validatedAddress should be null' },
              { field: 'requestAddressSanitized', condition: 'notNull', description: 'requestAddressSanitized should be populated' }
            ]
          }
        ],
        commonErrors: this.businessRules
          .filter(r => r.name.includes('Error'))
          .map(r => ({
            name: r.name,
            httpStatus: 500,
            cause: r.description,
            testData: {}
          }))
      }],
      globalTestData: {
        validAddresses: this.allTestData.get('verified') || [],
        invalidAddresses: this.allTestData.get('notVerified') || [],
        boundaryData: []
      },
      generationHints: this.generationHints.slice(0, 20) // Limit hints
    };
  }

  /**
   * Count files in directory
   */
  private countFiles(dir: string): number {
    let count = 0;
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      const files = fs.readdirSync(d);
      for (const file of files) {
        const filePath = path.join(d, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walk(filePath);
        } else if (stat.isFile()) {
          count++;
        }
      }
    };
    walk(dir);
    return count;
  }

  /**
   * Count test files analyzed
   */
  private countTestFiles(): number {
    return this.generationHints.filter(h => h.category === 'test_assertion').length;
  }

  /**
   * Print summary
   */
  private printSummary(stats: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FULL ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n   Files analyzed:        ${stats.filesAnalyzed}`);
    console.log(`   Test files found:      ${stats.testFilesFound}`);
    console.log(`   Verified addresses:    ${stats.verifiedAddresses}`);
    console.log(`   Corrected addresses:   ${stats.correctedAddresses}`);
    console.log(`   NOT_VERIFIED addresses:${stats.notVerifiedAddresses}`);
    console.log(`   STREET_PARTIAL:        ${stats.streetPartialAddresses}`);
    console.log(`   PREMISES_PARTIAL:      ${stats.premisesPartialAddresses}`);
    console.log(`   Business rules:        ${stats.businessRules}`);
    console.log(`   Edge cases:            ${stats.edgeCases}`);
    console.log(`   Config values:         ${stats.configValues}`);
  }

  /**
   * Empty stats
   */
  private emptyStats(): any {
    return {
      filesAnalyzed: 0, testFilesFound: 0, verifiedAddresses: 0,
      correctedAddresses: 0, notVerifiedAddresses: 0, streetPartialAddresses: 0,
      premisesPartialAddresses: 0, businessRules: 0, edgeCases: 0, configValues: 0
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Save context
   */
  async saveContext(context: ApiContext, teamName: string): Promise<string> {
    const contextDir = path.join(process.cwd(), 'swagger', 'teams', teamName, 'context');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
    const contextPath = path.join(contextDir, 'api-context.json');
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
    return contextPath;
  }
}

