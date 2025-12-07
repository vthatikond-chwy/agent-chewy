import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import { NLParser, type TestPlan, type TestStep } from '../core/nlParser.js';
import { LocatorHelper } from '../healing/locatorHelper.js';
import { VisionHealer } from '../healing/visionHealer.js';
import { OptimizedHealingEngine, type HealingConfig } from '../healing/optimizedHealingEngine.js';
import { PopupHandler } from './popupHandler.js';
import { CredentialInjector } from '../core/credentialInjector.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface UIAgentOptions {
  headless?: boolean;
  recordVideo?: boolean;
  recordScreenshots?: boolean;
  useVision?: boolean;
  visionMode?: 'none' | 'fallback' | 'all'; // 'fallback' = only when selectors fail, 'all' = always use vision
  outputDir?: string;
}

export interface ExecutionResult {
  success: boolean;
  stepsExecuted: number;
  totalSteps: number;
  errors: Array<{ step: number; description: string; error: string }>;
  screenshots?: string[];
  video?: string;
}

export class UIAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private parser: NLParser;
  private locatorHelper: LocatorHelper | null = null;
  private healingEngine: OptimizedHealingEngine | null = null;
  private visionHealer: VisionHealer | null = null;
  private popupHandler: PopupHandler | null = null;
  private options: UIAgentOptions;
  private screenshots: string[] = [];

  constructor(apiKey: string, options: UIAgentOptions = {}) {
    this.parser = new NLParser(apiKey);
    this.options = {
      headless: false,
      recordVideo: true,
      recordScreenshots: true,
      useVision: true,
      visionMode: 'fallback', // Default: use vision as fallback only
      outputDir: 'test-results',
      ...options,
    };

    if (this.options.useVision) {
      const screenshotDir = path.join(
        this.options.outputDir || 'test-results',
        'screenshots'
      );
      this.visionHealer = new VisionHealer(apiKey, screenshotDir);
    }
  }

  /**
   * Initializes the browser and page
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: this.options.headless,
    });

    const videoDir = this.options.recordVideo
      ? path.join(this.options.outputDir || 'test-results', 'videos')
      : undefined;

    if (videoDir) {
      await fs.mkdir(videoDir, { recursive: true });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: this.options.recordVideo
        ? {
            dir: videoDir,
            size: { width: 1920, height: 1080 },
          }
        : undefined,
    });

    this.page = await this.context.newPage();
    this.locatorHelper = new LocatorHelper(this.page);
    this.popupHandler = new PopupHandler(this.page);

    // Initialize optimized healing engine
    if (this.page) {
      const healingConfig: HealingConfig = {
        enableVision: this.options.useVision || false,
        visionTimeout: 15000,
        maxRetries: 3,
        fastMode: this.options.visionMode === 'all', // Skip fallbacks if vision-all
      };
      this.healingEngine = new OptimizedHealingEngine(
        this.page,
        healingConfig,
        this.visionHealer || undefined
      );
    }

    console.log('✓ Browser initialized');
  }

  /**
   * Executes a natural language instruction
   */
  async run(instruction: string): Promise<ExecutionResult> {
    try {
      await this.initialize();

      console.log('📝 Parsing instruction...');
      let plan = await this.parser.parse(instruction);
      
      // Inject credentials from .env
      const credentials = CredentialInjector.getCredentials();
      if (credentials.url || credentials.username || credentials.password) {
        console.log('🔐 Injecting credentials from .env...');
        plan = CredentialInjector.injectCredentials(plan);
      }
      
      console.log(`✓ Parsed into ${plan.scenarios.length} scenario(s)`);

      const result: ExecutionResult = {
        success: true,
        stepsExecuted: 0,
        totalSteps: 0,
        errors: [],
      };

      // Execute each scenario
      for (const scenario of plan.scenarios) {
        console.log(`\n📋 Executing scenario: ${scenario.name}`);
        result.totalSteps += scenario.steps.length;

        for (let i = 0; i < scenario.steps.length; i++) {
          const step = scenario.steps[i];
          console.log(`\n  Step ${i + 1}/${scenario.steps.length}: ${step.description}`);

          try {
            await this.executeStep(step);
            result.stepsExecuted++;

            // Take screenshot after each step if enabled
            if (this.options.recordScreenshots && this.page) {
              const screenshotPath = await this.takeScreenshot(
                `step-${result.stepsExecuted}`
              );
              if (screenshotPath) {
                this.screenshots.push(screenshotPath);
              }
            }

            // Handle popups after each step
            if (this.popupHandler) {
              await this.popupHandler.handlePopups();
              await this.popupHandler.dismissCookieBanners();
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`  ❌ Error: ${errorMessage}`);

            result.errors.push({
              step: result.stepsExecuted + 1,
              description: step.description,
              error: errorMessage,
            });

            // Try vision healing if enabled - do it immediately for click/type actions
            if (
              this.options.useVision &&
              this.visionHealer &&
              this.page &&
              (step.action === 'click' || step.action === 'type')
            ) {
              console.log('  🔍 Attempting vision-based healing (this may take 10-15 seconds)...');
              const visionStartTime = Date.now();
              try {
                await this.healWithVision(step);
                const visionTime = ((Date.now() - visionStartTime) / 1000).toFixed(1);
                result.stepsExecuted++;
                console.log(`  ✓ Vision healing succeeded (${visionTime}s)`);
                // Don't mark as failed if vision healing succeeded
                if (result.errors.length > 0) {
                  // Remove the last error since we recovered
                  result.errors.pop();
                }
              } catch (visionError) {
                const visionTime = ((Date.now() - visionStartTime) / 1000).toFixed(1);
                console.error(
                  `  ❌ Vision healing failed (${visionTime}s): ${
                    visionError instanceof Error
                      ? visionError.message
                      : String(visionError)
                  }`
                );
                result.success = false;
              }
            } else if (step.action !== 'navigate') {
              // Don't mark navigation failures as critical if other steps can proceed
              result.success = false;
            }
          }
        }
      }

      // Get video path if recording
      if (this.options.recordVideo && this.page) {
        const videoPath = await this.page.video()?.path();
        if (videoPath) {
          result.video = videoPath;
        }
      }

      result.screenshots = this.screenshots;

      await this.cleanup();
      return result;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Executes a single test step
   */
  private async executeStep(step: TestStep): Promise<void> {
    if (!this.page || !this.locatorHelper) {
      throw new Error('Browser not initialized');
    }

    switch (step.action) {
      case 'navigate':
        await this.page.goto(step.target, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        // Wait a bit for page to stabilize, but don't wait for networkidle which can timeout
        await this.page.waitForTimeout(2000);
        break;

      case 'click':
        if (this.healingEngine && this.options.visionMode === 'all') {
          // Use vision for all elements
          await this.healingEngine.clickElement(step.target, step.description);
        } else if (this.healingEngine && this.options.visionMode === 'fallback') {
          // Try standard first, then vision if fails
          try {
            await this.locatorHelper!.clickElement(step.target, {
              useVision: false,
              timeout: 2000,
            });
          } catch {
            // Fallback to vision
            await this.healingEngine.clickElement(step.target, step.description);
          }
        } else {
          // No vision
          await this.locatorHelper!.clickElement(step.target, {
            useVision: false,
            timeout: 5000,
          });
        }
        break;

      case 'type':
        if (step.value) {
          if (this.healingEngine && this.options.visionMode === 'all') {
            // Use vision for all elements
            await this.healingEngine.typeIntoElement(step.target, step.value, step.description);
          } else if (this.healingEngine && this.options.visionMode === 'fallback') {
            // Try standard first, then vision if fails
            try {
              await this.locatorHelper!.typeIntoElement(step.target, step.value, {
                useVision: false,
                timeout: 2000,
              });
            } catch {
              // Fallback to vision
              await this.healingEngine.typeIntoElement(step.target, step.value, step.description);
            }
          } else {
            // No vision
            await this.locatorHelper!.typeIntoElement(step.target, step.value, {
              useVision: false,
              timeout: 5000,
            });
          }
        }
        break;

      case 'select':
        if (step.value) {
          await this.locatorHelper.selectFromElement(step.target, step.value);
        }
        break;

      case 'wait':
        await this.locatorHelper.waitForElement(step.target);
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }

    // Small delay between steps
    await this.page.waitForTimeout(500);
  }

  /**
   * Attempts to heal a failed step using GPT-4 Vision
   */
  private async healWithVision(step: TestStep): Promise<void> {
    if (!this.page || !this.visionHealer || !this.locatorHelper) {
      throw new Error('Vision healing not available');
    }

    const visionResult = await this.visionHealer.findElementWithVision(
      this.page,
      step.target,
      step.description
    );

    console.log(`  🎯 Vision found selector: ${visionResult.selector}`);

    // Update locator helper to use vision-found selector
    if (step.action === 'click') {
      await this.locatorHelper.clickElement(visionResult.selector, {
        useVision: false,
      });
    } else if (step.action === 'type' && step.value) {
      await this.locatorHelper.typeIntoElement(
        visionResult.selector,
        step.value,
        { useVision: false }
      );
    }
  }

  /**
   * Takes a screenshot
   */
  private async takeScreenshot(name: string): Promise<string | null> {
    if (!this.page) return null;

    try {
      const screenshotDir = path.join(
        this.options.outputDir || 'test-results',
        'screenshots'
      );
      await fs.mkdir(screenshotDir, { recursive: true });

      const screenshotPath = path.join(
        screenshotDir,
        `${name}-${Date.now()}.png`
      );
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      return screenshotPath;
    } catch (error) {
      console.warn(`Failed to take screenshot: ${error}`);
      return null;
    }
  }

  /**
   * Cleans up browser resources
   */
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.page = null;
    this.locatorHelper = null;
    this.popupHandler = null;

    console.log('✓ Cleanup complete');
  }
}

