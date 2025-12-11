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
    // First check the description which contains the actual element name
    const desc = action.description?.toLowerCase() || '';
    const s = action.selector.toLowerCase();
    
    // DEBUG: Uncomment to trace execution
    // console.log('getClickDescription:', { desc, s });
    
    // Check for specific button/link names from description first (MUST be before generic checks)
    // Description format: "Click on getByRole "link" with name "Sign Out""
    if (desc.includes('sign out') || desc.includes('signout')) {
      return 'sign out link';
    }
    // Description format: "Click on getByRole "button" with name "Account""
    // IMPORTANT: Check this BEFORE checking selector for account-link
    if (desc.includes('button') && desc.includes('account') && !desc.includes('account-link')) {
      return 'account button';
    }
    
    // Check place order button FIRST (before proceed/checkout)
    if (s.includes('place-order-button') || s.includes('order-button')) return 'place order button';
    // Only match account-link testid specifically, not just any "account" in selector
    // This should NOT match getByRole('button', { name: 'Account' })
    if (s.includes('getbytestid') && s.includes("'account-link'")) return 'account link';
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
    // Check for links - but exclude account links AND sign out (already handled above)
    if ((s.includes('link') || desc.includes('link')) && !s.includes('account-link') && !desc.includes('sign out')) {
      // Extract name from description if available (e.g., "Click on getByRole "link" with name "Product Name"")
      const nameMatch = desc.match(/name\s+['"](.+?)['"]/);
      if (nameMatch && nameMatch[1]) {
        const linkName = nameMatch[1].toLowerCase();
        // Don't use generic "product link" if we have a specific name
        if (linkName && linkName !== 'sign out') {
          return `${nameMatch[1]} link`;
        }
      }
      return 'product link';
    }
    // Check for buttons with names
    if (s.includes('button') || desc.includes('button')) {
      const nameMatch = desc.match(/name\s+['"](.+?)['"]/);
      if (nameMatch && nameMatch[1]) {
        const buttonName = nameMatch[1].toLowerCase();
        if (buttonName === 'account') return 'account button';
        if (buttonName === 'sign in') return 'sign in button';
        if (buttonName === 'continue') return 'continue button';
        return `${nameMatch[1]} button`;
      }
    }
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
        `  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});`,
        `  const currentUrl = page.url();`,
        `  if (!currentUrl.includes('thankyou')) {`,
        `    throw new Error(\`Expected order confirmation page, but got \${currentUrl}\`);`,
        `  }`,
        `  console.log('✓ Order confirmed! URL:', currentUrl);`,
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
            const waitAfter = this.shouldWaitAfterAction(action, recording.actions[index + 1]);
            
            // Special handling for nested selectors (like smartshelf-actions) that might need more time
            const isNestedSelector = action.selector.includes('.getBy');
            const isCheckoutButton = clickDesc.includes('checkout') || clickDesc.includes('proceed');
            const timeout = (isNestedSelector || isCheckoutButton) ? 20000 : 10000;
            
            // For nested selectors, wait for parent first
            let waitForParent = '';
            if (isNestedSelector && action.selector.includes('getByTestId')) {
              const parentMatch = action.selector.match(/getByTestId\(['"](.+?)['"]\)\.getBy/);
              if (parentMatch) {
                waitForParent = `  await page.getByTestId('${parentMatch[1]}').waitFor({ state: 'visible', timeout: ${timeout} });\n`;
              }
            }
            
            stepDefs.push(
              `When('I click on ${clickDesc}', async function() {`,
              waitForParent,
              `  const element = ${selector};`,
              `  await element.waitFor({ state: 'visible', timeout: ${timeout} });`,
              `  await element.click();`,
              needsWait 
                ? `  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });`
                : `  await page.waitForTimeout(${waitAfter});`,
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

  private shouldWaitAfterAction(action: RecordedAction, nextAction?: RecordedAction): number {
    // After add to cart, wait longer for modal/overlay to appear
    if (action.selector.toLowerCase().includes('add-to-cart') || action.selector.toLowerCase().includes('add-to-cart-button')) {
      return 2000; // 2 seconds for modal to appear
    }
    return 500; // Default wait
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
        const testId = match[1];
        // Common testids that are often ambiguous (appear multiple times on page)
        const ambiguousTestIds = ['account-link', 'button', 'link', 'nav-link', 'menu-item'];
        const isAmbiguous = ambiguousTestIds.includes(testId);
        
        if (selector.includes('.') && !selector.startsWith('getByTestId')) {
          const chainMatch = selector.match(/(.+?)\.getByTestId/);
          if (chainMatch) {
            const code = `page.${chainMatch[1]}.getByTestId('${testId}')`;
            return isAmbiguous ? `${code}.first()` : code;
          }
        }
        const code = `page.getByTestId('${testId}')`;
        return isAmbiguous ? `${code}.first()` : code;
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
