import { Command } from 'commander';
import { NLParser } from '../core/nlParser.js';
import { GherkinGenerator } from '../core/gherkinGenerator.js';
import { StepDefGenerator } from '../core/stepDefGenerator.js';
import { UIAgent } from '../agent/uiAgent.js';
import { CredentialInjector } from '../core/credentialInjector.js';
import { CodegenRecorder, type RecordedSession } from '../agent/codegenRecorder.js';
import { RecordingToGherkinGenerator } from '../agent/recordingToGherkin.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

dotenv.config();

const program = new Command();

program
  .name('agent-chewy')
  .description('AI-powered test automation tool')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate test files from natural language instruction')
  .argument('<instruction>', 'Natural language test instruction')
  .option('-o, --output <dir>', 'Output directory', 'features')
  .action(async (instruction: string, options: { output?: string }) => {
    try {
      console.log('Parsing instruction...');
      const parser = new NLParser(process.env.OPENAI_API_KEY!);
      let plan = await parser.parse(instruction);

      // Inject credentials from .env
      const credentials = CredentialInjector.getCredentials();
      if (credentials.url || credentials.username || credentials.password) {
        console.log('🔐 Injecting credentials from .env...');
        plan = CredentialInjector.injectCredentials(plan);
      }

      console.log('Generating Gherkin feature file...');
      const generator = new GherkinGenerator();
      const featureContent = generator.generate(plan);

      // Create output directory if it doesn't exist
      const outputDir = options.output || 'features';
      await fs.mkdir(outputDir, { recursive: true });

      // Generate feature file name from feature name
      const featureFileName = plan.featureName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const featurePath = path.join(outputDir, `${featureFileName}.feature`);

      await fs.writeFile(featurePath, featureContent, 'utf-8');
      console.log(`✓ Feature file created: ${featurePath}`);

      // Generate step definitions
      console.log('Generating step definitions...');
      const stepDefGenerator = new StepDefGenerator();
      const stepsDir = path.join(outputDir, '..', 'steps');
      await fs.mkdir(stepsDir, { recursive: true });
      
      const stepDefPath = path.join(stepsDir, 'step-definitions.ts');
      await stepDefGenerator.saveToFile(stepDefPath);
      console.log(`✓ Step definitions created: ${stepDefPath}`);

      console.log('\n✓ Test generation complete!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Parse instruction and execute test immediately')
  .argument('<instruction>', 'Natural language test instruction')
  .action(async (instruction: string) => {
    try {
      console.log('Parsing instruction...');
      const parser = new NLParser(process.env.OPENAI_API_KEY!);
      let plan = await parser.parse(instruction);

      // Inject credentials from .env
      const credentials = CredentialInjector.getCredentials();
      if (credentials.url || credentials.username || credentials.password) {
        console.log('🔐 Injecting credentials from .env...');
        plan = CredentialInjector.injectCredentials(plan);
      }

      console.log('\nGenerated Test Plan:');
      console.log(JSON.stringify(plan, null, 2));

      console.log('\nGenerating test files...');
      const generator = new GherkinGenerator();
      const featureContent = generator.generate(plan);

      // Create temp directory
      const tempDir = path.join(process.cwd(), '.temp');
      await fs.mkdir(tempDir, { recursive: true });

      const featureFileName = plan.featureName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const featurePath = path.join(tempDir, `${featureFileName}.feature`);

      await fs.writeFile(featurePath, featureContent, 'utf-8');
      console.log(`✓ Feature file created: ${featurePath}`);

      // Generate step definitions
      const stepDefGenerator = new StepDefGenerator();
      const stepDefPath = path.join(tempDir, 'step-definitions.ts');
      await stepDefGenerator.saveToFile(stepDefPath);
      console.log(`✓ Step definitions created: ${stepDefPath}`);

      console.log('\n⚠️  Test execution not yet implemented. Use "agent-chewy execute" to run feature files.');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

const uiCommand = program
  .command('ui')
  .description('UI testing commands (recording, generation, execution)');

uiCommand
  .command('record [startUrl]')
  .description('Record user actions in browser using Playwright codegen')
  .action(async (startUrl?: string) => {
    try {
      const recorder = new CodegenRecorder();
      const sessionFile = await recorder.record(startUrl);
      console.log(`\n✅ Recording completed!`);
      console.log(`📁 Session file: ${sessionFile}`);
      console.log(`\nNext step: agent-chewy ui generate-from-recording ${sessionFile}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

uiCommand
  .command('generate-from-recording <recordingFile>')
  .description('Generate Cucumber tests from recorded session')
  .option('-o, --output <dir>', 'Output directory', 'features/ui')
  .action(async (recordingFile: string, options: { output?: string }) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }

      console.log(`📖 Reading recording: ${recordingFile}`);
      let recording: RecordedSession;
      
      if (recordingFile.endsWith('.js')) {
        // Parse codegen JS file
        const recorder = new CodegenRecorder();
        recording = await recorder.parseCodegenFile(recordingFile);
      } else {
        // Parse JSON session file
        const content = await fs.readFile(recordingFile, 'utf-8');
        recording = JSON.parse(content);
      }

      console.log('🤖 Generating Cucumber tests from recording...');
      const generator = new RecordingToGherkinGenerator(process.env.OPENAI_API_KEY);
      const { feature, steps } = await generator.generate(recording);

      // Create output directories
      const outputDir = options.output || 'features/ui';
      const stepsDir = path.join(outputDir, '..', 'steps', 'ui');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(stepsDir, { recursive: true });

      // Generate feature file name
      const featureName = recording.id || `recorded-${Date.now()}`;
      const featurePath = path.join(outputDir, `${featureName}.feature`);
      const stepsPath = path.join(stepsDir, `${featureName}.steps.ts`);

      await fs.writeFile(featurePath, feature, 'utf-8');
      await fs.writeFile(stepsPath, steps, 'utf-8');

      console.log(`\n✅ Generated Cucumber tests from recording!`);
      console.log(`📄 Feature file: ${featurePath}`);
      console.log(`📄 Step definitions: ${stepsPath}`);
      console.log(`\nNext step: agent-chewy ui execute ${featurePath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

uiCommand
  .command('run <instruction>')
  .description('Run tests interactively with UI agent (self-healing, screenshots, video)')
  .option('--headless', 'Run in headless mode', false)
  .option('--no-vision', 'Disable GPT-4 Vision self-healing (faster)', false)
  .option('--vision-fallback', 'Use vision only when selectors fail (recommended)', true)
  .option('--vision-all', 'Use vision for all elements (slow)', false)
  .option('--no-video', 'Disable video recording', false)
  .option('--no-screenshots', 'Disable screenshot recording', false)
  .option('-o, --output <dir>', 'Output directory for results', 'test-results')
  .action(async (instruction: string, options: {
    headless?: boolean;
    vision?: boolean;
    video?: boolean;
    screenshots?: boolean;
    output?: string;
    visionFallback?: boolean;
    visionAll?: boolean;
  }) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }

      console.log('🤖 Starting UI Agent...\n');
      console.log(`Instruction: ${instruction}\n`);

      // Determine vision mode
      let useVision = true;
      let visionMode: 'none' | 'fallback' | 'all' = 'fallback';
      
      if (options.vision === false || options.noVision) {
        useVision = false;
        visionMode = 'none';
      } else if (options.visionAll) {
        visionMode = 'all';
      } else {
        visionMode = 'fallback'; // Default: use vision as fallback
      }

      const agent = new UIAgent(process.env.OPENAI_API_KEY, {
        headless: options.headless || false,
        recordVideo: options.video !== false,
        recordScreenshots: options.screenshots !== false,
        useVision,
        visionMode,
        outputDir: options.output || 'test-results',
      });

      const result = await agent.run(instruction);

      console.log('\n' + '='.repeat(60));
      console.log('📊 Execution Summary');
      console.log('='.repeat(60));
      console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`Steps executed: ${result.stepsExecuted}/${result.totalSteps}`);
      
      if (result.errors.length > 0) {
        console.log(`\nErrors (${result.errors.length}):`);
        result.errors.forEach((err) => {
          console.log(`  Step ${err.step}: ${err.description}`);
          console.log(`    → ${err.error}`);
        });
      }

      if (result.screenshots && result.screenshots.length > 0) {
        console.log(`\n📸 Screenshots: ${result.screenshots.length} captured`);
        result.screenshots.forEach((screenshot) => {
          console.log(`   - ${screenshot}`);
        });
      }

      if (result.video) {
        console.log(`\n🎥 Video: ${result.video}`);
      }

      console.log('\n' + '='.repeat(60));

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('execute')
  .description('Execute a Cucumber feature file')
  .argument('<feature-file>', 'Path to .feature file')
  .option('-b, --browser <browser>', 'Browser to use (chromium, firefox, webkit)', 'chromium')
  .option('--require <path>', 'Path to step definitions (auto-detected if not provided)')
  .action(async (featureFile: string, options: { browser?: string; require?: string }) => {
    try {
      console.log(`🚀 Executing feature file: ${featureFile}`);
      
      // Check if file exists
      try {
        await fs.access(featureFile);
      } catch {
        throw new Error(`Feature file not found: ${featureFile}`);
      }

      // Auto-detect step definitions if not provided
      let stepDefPath = options.require;
      if (!stepDefPath) {
        // Try to find step definitions in the same directory structure
        const featureDir = path.dirname(featureFile);
        const featureName = path.basename(featureFile, '.feature');
        const stepsDir = path.join(featureDir, '..', 'steps', 'ui');
        stepDefPath = path.join(stepsDir, `${featureName}.steps.ts`);
        
        // Check if it exists
        try {
          await fs.access(stepDefPath);
        } catch {
          // Try alternative location
          stepDefPath = path.join('features', 'steps', 'ui', `${featureName}.steps.ts`);
          try {
            await fs.access(stepDefPath);
          } catch {
            throw new Error(`Step definitions not found. Expected: ${stepDefPath}`);
          }
        }
      }

      console.log(`📄 Step definitions: ${stepDefPath}`);
      console.log(`🌐 Browser: ${options.browser || 'chromium'}\n`);

      // Run cucumber-js
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const command = `npx cucumber-js "${featureFile}" --require "${stepDefPath}" --require-module tsx/esm --format progress-bar`;

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          env: { ...process.env },
        });
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
      } catch (error: any) {
        // Cucumber exits with non-zero on failures, which is normal
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        process.exit(error.code || 1);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

