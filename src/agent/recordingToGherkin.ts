import type { RecordedSession, RecordedAction } from './codegenRecorder.js';

export interface GeneratedTest {
  feature: string;
  steps: string;
}

export class RecordingToGherkinGenerator {
  constructor(apiKey?: string) {
    // API key no longer needed for simple generation
  }

  async generate(recording: RecordedSession): Promise<GeneratedTest> {
    console.log('🤖 Generating Cucumber tests from recording...');
    console.log(`📊 Parsed ${recording.actions.length} actions`);

    const featureContent = this.generateSimpleFeature(recording);
    const stepsContent = this.generateSimpleSteps(recording);

    return {
      feature: featureContent,
      steps: stepsContent
    };
  }

  private generateSimpleFeature(recording: RecordedSession): string {
    const lines = [
      'Feature: Recorded User Flow',
      '  Automated test generated from browser recording',
      '',
      '  Scenario: Execute recorded actions',
    ];

    recording.actions.forEach((action, index) => {
      const stepType = index === 0 ? 'Given' : 'When';
      
      switch (action.type) {
        case 'navigate':
          // First navigation is Given, later navigations are When/Then
          if (index === 0) {
            lines.push(`    ${stepType} I navigate to "${action.url}"`);
          } else if (action.url?.includes('thankyou')) {
            // This is the order confirmation - make it a Then assertion
            lines.push(`    Then I should see the order confirmation page`);
          } else {
            lines.push(`    ${stepType} I navigate to "${action.url}"`);
          }
          break;
        case 'click':
          const clickDesc = this.getClickDescription(action);
          lines.push(`    ${stepType} I click on ${clickDesc}`);
          break;
        case 'fill':
          const fillDesc = this.getFillDescription(action);
          lines.push(`    ${stepType} I enter "${action.value}" into ${fillDesc}`);
          break;
      }
    });

    return lines.join('\n');
  }

  private getClickDescription(action: RecordedAction): string {
    const s = action.selector.toLowerCase();
    // Check place order button FIRST (before proceed/checkout)
    if (s.includes('place-order-button') || s.includes('order-button')) return 'place order button';
    if (s.includes('account')) return 'account link';
    if (s.includes('continue')) return 'continue button';
    if (s.includes('sign in')) return 'sign in button';
    if (s.includes('search-button')) return 'search button';
    if (s.includes('add-to-cart')) return 'add to cart button';
    if (s.includes('proceed') || s.includes('checkout')) return 'proceed to checkout button';
    if (s.includes('credit') || s.includes('debit') || s.includes('card')) return 'payment method';
    // Check for textbox clicks (focus actions)
    if (s.includes('textbox')) {
      if (s.includes('email')) return 'email field';
      if (s.includes('password')) return 'password field';
      if (s.includes('search')) return 'search field';
    }
    if (s.includes('link') && !s.includes('account')) return 'product link';
    return 'element';
  }

  private getFillDescription(action: RecordedAction): string {
    const s = action.selector.toLowerCase();
    if (s.includes('email')) return 'email field';
    if (s.includes('password')) return 'password field';
    if (s.includes('search')) return 'search field';
    return 'field';
  }

  private generateSimpleSteps(recording: RecordedSession): string {
    const stepDefs: string[] = [
      `import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';`,
      `import type { Browser, Page } from 'playwright';`,
      `import { chromium } from 'playwright';`,
      ``,
      `setDefaultTimeout(30000);`,
      `let browser: Browser;`,
      `let page: Page;`,
      ``,
      `Before(async function() {`,
      `  browser = await chromium.launch({ headless: false });`,
      `  page = await browser.newContext().then(c => c.newPage());`,
      `});`,
      ``,
      `After(async function() {`,
      `  await browser.close();`,
      `});`,
      ``,
    ];

    // Track unique step patterns
    const generatedPatterns = new Set<string>();

    // Check if we have a thankyou navigation for order confirmation
    const hasOrderConfirmation = recording.actions.some(a => 
      a.type === 'navigate' && a.url?.includes('thankyou')
    );
    
    if (hasOrderConfirmation && !generatedPatterns.has('order-confirmation')) {
      generatedPatterns.add('order-confirmation');
      stepDefs.push(
        `Then('I should see the order confirmation page', async function() {`,
        `  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});`,
        `  const currentUrl = page.url();`,
        `  if (!currentUrl.includes('thankyou')) {`,
        `    throw new Error(\`Expected order confirmation page, but got \${currentUrl}\`);`,
        `  }`,
        `});`,
        ``
      );
    }

    recording.actions.forEach((action, index) => {
      switch (action.type) {
        case 'navigate':
          if (!generatedPatterns.has('navigate')) {
            generatedPatterns.add('navigate');
            stepDefs.push(
              `Given('I navigate to {string}', async function(url: string) {`,
              `  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });`,
              `  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});`,
              `});`,
              ``
            );
          }
          break;

        case 'click':
          const clickDesc = this.getClickDescription(action);
          const clickPattern = `click_${clickDesc}`;
          
          if (!generatedPatterns.has(clickPattern)) {
            generatedPatterns.add(clickPattern);
            const selector = this.convertSelectorToCode(action.selector);
            const needsWait = this.shouldWaitForNavigation(action, recording.actions[index + 1]);
            
            stepDefs.push(
              `When('I click on ${clickDesc}', async function() {`,
              `  const element = ${selector};`,
              `  await element.waitFor({ state: 'visible', timeout: 10000 });`,
              `  await element.click();`,
              needsWait 
                ? `  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });`
                : `  await page.waitForTimeout(500);`,
              `});`,
              ``
            );
          }
          break;

        case 'fill':
          const fillDesc = this.getFillDescription(action);
          const fillPattern = `fill_${fillDesc}`;
          
          if (!generatedPatterns.has(fillPattern)) {
            generatedPatterns.add(fillPattern);
            const selector = this.convertSelectorToCode(action.selector);
            const isPassword = action.selector.toLowerCase().includes('password');
            
            stepDefs.push(
              `When('I enter {string} into ${fillDesc}', async function(value: string) {`,
              `  const element = ${selector};`,
              `  await element.waitFor({ state: 'visible', timeout: ${isPassword ? 20000 : 10000} });`,
              `  await element.click();`,
              `  await element.fill(value);`,
              `  await page.waitForTimeout(300);`,
              `});`,
              ``
            );
          }
          break;
      }
    });

    return stepDefs.join('\n');
  }

  private shouldWaitForNavigation(action: RecordedAction, nextAction?: RecordedAction): boolean {
    const navigationKeywords = ['continue', 'submit', 'sign in', 'login', 'proceed', 'checkout'];
    const selectorLower = action.selector.toLowerCase();
    return action.type === 'click' && navigationKeywords.some(kw => selectorLower.includes(kw));
  }

  private convertSelectorToCode(selector: string): string {
    const nestedTestIdMatch = selector.match(/getByTestId\('(.+?)'\)\.getByTestId\('(.+?)'\)/);
    if (nestedTestIdMatch) {
      return `page.getByTestId('${nestedTestIdMatch[1]}').getByTestId('${nestedTestIdMatch[2]}')`;
    }
    
    const testIdRoleMatch = selector.match(/getByTestId\('(.+?)'\)\.getByRole\('(.+?)',\s*\{\s*name:\s*['"](.+?)['"]/);
    if (testIdRoleMatch) {
      return `page.getByTestId('${testIdRoleMatch[1]}').getByRole('${testIdRoleMatch[2]}', { name: '${testIdRoleMatch[3]}' })`;
    }
    
    if (selector.includes("getByTestId('")) {
      const match = selector.match(/getByTestId\('(.+?)'\)/);
      if (match) {
        if (selector.includes('.') && !selector.startsWith('getByTestId')) {
          const chainMatch = selector.match(/(.+?)\.getByTestId/);
          if (chainMatch) {
            return `page.${chainMatch[1]}.getByTestId('${match[1]}')`;
          }
        }
        return `page.getByTestId('${match[1]}')`;
      }
    }
    
    if (selector.includes("getByRole('")) {
      const match = selector.match(/getByRole\('(.+?)',\s*\{\s*name:\s*['"](.+?)['"]/);
      if (match) {
        return `page.getByRole('${match[1]}', { name: '${match[2]}' })`;
      }
    }
    
    if (selector.includes("getByText('")) {
      const match = selector.match(/getByText\('(.+?)'\)/);
      if (match) {
        return `page.getByText('${match[1]}')`;
      }
    }
    
    return `page.locator('${selector}')`;
  }
}
