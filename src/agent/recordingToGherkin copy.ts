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
        lines.push(`    ${stepType} I navigate to "${action.url}"`);
        break;
      case 'click':
        lines.push(`    ${stepType} I perform click action ${index}`);
        break;
      case 'fill':
        lines.push(`    ${stepType} I fill field ${index} with "${action.value}"`);
        break;
    }
  });

  return lines.join('\n');
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
    `Given('I navigate to {string}', async function(url: string) {`,
    `  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });`,
    `  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});`,
    `});`,
    ``,
  ];

  // Generate unique step definitions
  const generatedSteps = new Set<string>();

  recording.actions.forEach((action, index) => {
    if (action.type === 'click') {
      const stepKey = `click_${index}`;
      if (!generatedSteps.has(stepKey)) {
        generatedSteps.add(stepKey);
        const selector = this.convertSelectorToCode(action.selector);
        const needsWait = this.shouldWaitForNavigation(action, recording.actions[index + 1]);
        
        stepDefs.push(
          `When('I perform click action {int}', async function(actionNum: number) {`,
          `  // Action ${index}: ${action.selector}`,
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
    } else if (action.type === 'fill') {
      const stepKey = `fill_${index}`;
      if (!generatedSteps.has(stepKey)) {
        generatedSteps.add(stepKey);
        const selector = this.convertSelectorToCode(action.selector);
        const isPassword = action.selector.toLowerCase().includes('password');
        
        stepDefs.push(
          `When('I fill field {int} with {string}', async function(fieldNum: number, value: string) {`,
          `  // Action ${index}: ${action.selector}`,
          `  const element = ${selector};`,
          `  await element.waitFor({ state: 'visible', timeout: ${isPassword ? 20000 : 10000} });`,
          `  await element.click();`,
          `  await element.fill(value);`,
          `  await page.waitForTimeout(300);`,
          `});`,
          ``
        );
      }
    }
  });

  return stepDefs.join('\n');
}