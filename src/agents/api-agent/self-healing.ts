/**
 * Self-healing functionality for API test generator
 * Automatically detects and fixes missing step definitions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

interface UndefinedStep {
  stepText: string;
  stepType: 'Given' | 'When' | 'Then' | 'And' | 'But';
  filePath: string;
  lineNumber: number;
}

export class SelfHealing {
  private openai: OpenAI;
  private stepsDir: string;

  constructor(service?: string) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.stepsDir = service 
      ? path.join(process.cwd(), 'src', 'steps', 'api', service)
      : path.join(process.cwd(), 'src', 'steps', 'api');
  }

  /**
   * Run tests and detect undefined steps
   */
  async detectUndefinedSteps(): Promise<UndefinedStep[]> {
    try {
      const { stdout, stderr } = await execAsync(
        'npm run test:api 2>&1',
        { cwd: process.cwd() }
      );

      const undefinedSteps: UndefinedStep[] = [];
      const output = stdout + stderr;
      
      // Parse Cucumber output for undefined steps
      const undefinedPattern = /Undefined\. Implement with the following snippet:\s*\n\s*(\w+)\(['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = undefinedPattern.exec(output)) !== null) {
        const stepType = match[1] as 'Given' | 'When' | 'Then' | 'And' | 'But';
        const stepText = match[2];
        
        // Try to find which feature file this step belongs to
        const featureFileMatch = output.substring(0, match.index).match(/(features\/api\/[^:]+):(\d+)/);
        const filePath = featureFileMatch ? featureFileMatch[1] : 'unknown';
        const lineNumber = featureFileMatch ? parseInt(featureFileMatch[2]) : 0;
        
        undefinedSteps.push({
          stepText,
          stepType,
          filePath,
          lineNumber
        });
      }

      return undefinedSteps;
    } catch (error: any) {
      // Test failures are expected, we just need to parse the output
      return this.parseUndefinedStepsFromError(error.stdout || error.stderr || '');
    }
  }

  /**
   * Parse undefined steps from error output
   */
  private parseUndefinedStepsFromError(output: string): UndefinedStep[] {
    const undefinedSteps: UndefinedStep[] = [];
    
    // Pattern to match undefined step suggestions
    const pattern = /(\w+)\(['"]([^'"]+)['"]/g;
    const lines = output.split('\n');
    
    let inUndefinedSection = false;
    let currentFeature = '';
    let currentLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect feature file and line number
      const featureMatch = line.match(/(features\/api\/[^:]+):(\d+)/);
      if (featureMatch) {
        currentFeature = featureMatch[1];
        currentLine = parseInt(featureMatch[2]);
      }
      
      // Detect undefined step section
      if (line.includes('Undefined. Implement with the following snippet:')) {
        inUndefinedSection = true;
        continue;
      }
      
      if (inUndefinedSection) {
        const match = pattern.exec(line);
        if (match) {
          const stepType = match[1] as 'Given' | 'When' | 'Then' | 'And' | 'But';
          const stepText = match[2];
          
          undefinedSteps.push({
            stepText,
            stepType,
            filePath: currentFeature || 'unknown',
            lineNumber: currentLine
          });
          
          inUndefinedSection = false;
        }
      }
    }
    
    return undefinedSteps;
  }

  /**
   * Generate step definition for an undefined step
   */
  async generateStepDefinition(step: UndefinedStep, featureContent?: string): Promise<string> {
    const systemPrompt = `You are an expert in API test automation with TypeScript and Cucumber.
Generate a step definition that matches the given step text and follows best practices.`;

    const userPrompt = `Generate a TypeScript step definition for this Cucumber step:

Step Type: ${step.stepType}
Step Text: ${step.stepText}
${featureContent ? `\nFeature Context:\n${featureContent}` : ''}

Requirements:
1. Use @cucumber/cucumber decorators (${step.stepType})
2. Use proper TypeScript types
3. Use chai for assertions: import { expect } from 'chai';
4. Access response via this.response (AxiosResponse type)
5. Access requestBody via this.requestBody
6. Handle parameters correctly (use {string}, {int}, etc. in step text)
7. Include proper error handling
8. Return ONLY the step definition code, no markdown blocks, no imports (they're already in the file)

Example:
${step.stepType}('the response status code should be {int} for [scenario-name] test', function (this: CustomWorld, expectedStatusCode: number) {
  expect(this.response?.status).to.equal(expectedStatusCode);
});`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      });

      let content = response.choices[0].message.content || '';
      
      // Remove markdown code blocks if present
      content = content.replace(/^```typescript\n?/g, '').replace(/^```ts\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();
      
      return content;
    } catch (error: any) {
      throw new Error(`Failed to generate step definition: ${error.message}`);
    }
  }

  /**
   * Determine which step definition file to update based on feature file
   */
  private getStepDefinitionFile(featureFilePath: string): string {
    // Extract feature filename and convert to step definition filename
    const featureFileName = path.basename(featureFilePath, '.feature');
    const stepFileName = featureFileName + '.steps.ts';
    return path.join(this.stepsDir, stepFileName);
  }

  /**
   * Add step definition to the appropriate file
   */
  async addStepDefinition(step: UndefinedStep, stepDefinitionCode: string): Promise<void> {
    const stepFile = this.getStepDefinitionFile(step.filePath);
    
    // Read existing file
    let fileContent = '';
    if (fs.existsSync(stepFile)) {
      fileContent = fs.readFileSync(stepFile, 'utf-8');
    } else {
      // Create new file with basic structure
      fileContent = `import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse;
}

`;
    }
    
    // Check if step already exists
    if (fileContent.includes(step.stepText)) {
      console.log(`⚠️  Step definition already exists for: ${step.stepText}`);
      return;
    }
    
    // Add the new step definition before the last closing brace or at the end
    const lines = fileContent.split('\n');
    const lastBraceIndex = lines.length - 1;
    
    // Insert before the last line (or add at end)
    lines.splice(lastBraceIndex, 0, '', stepDefinitionCode);
    
    fs.writeFileSync(stepFile, lines.join('\n'), 'utf-8');
    console.log(`✅ Added step definition to ${path.basename(stepFile)}`);
  }

  /**
   * Self-heal: detect and fix all undefined steps
   */
  async heal(): Promise<void> {
    console.log('🔍 Detecting undefined steps...');
    const undefinedSteps = await this.detectUndefinedSteps();
    
    if (undefinedSteps.length === 0) {
      console.log('✅ No undefined steps found!');
      return;
    }
    
    console.log(`🔧 Found ${undefinedSteps.length} undefined step(s). Generating fixes...`);
    
    for (const step of undefinedSteps) {
      try {
        console.log(`\n📝 Generating step definition for: ${step.stepText}`);
        
        // Read feature file for context
        let featureContent = '';
        if (step.filePath !== 'unknown' && fs.existsSync(step.filePath)) {
          featureContent = fs.readFileSync(step.filePath, 'utf-8');
        }
        
        const stepDefinition = await this.generateStepDefinition(step, featureContent);
        await this.addStepDefinition(step, stepDefinition);
        
        console.log(`✅ Fixed: ${step.stepText}`);
      } catch (error: any) {
        console.error(`❌ Failed to fix step "${step.stepText}": ${error.message}`);
      }
    }
    
    console.log('\n✨ Self-healing complete!');
  }
}

