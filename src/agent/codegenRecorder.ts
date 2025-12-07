import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface RecordedAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'press' | 'check' | 'uncheck';
  selector: string;
  value?: string;
  url?: string;
  timestamp: number;
  description?: string;
}

export interface RecordedSession {
  id: string;
  startTime: number;
  endTime?: number;
  baseUrl: string;
  actions: RecordedAction[];
  sourceFile?: string;
}

export class CodegenRecorder {
  /**
   * Records user actions using Playwright codegen
   */
  async record(startUrl?: string): Promise<string> {
    console.log('🎬 Starting Playwright Codegen...');
    console.log('👉 Browser will open - perform your test actions');
    console.log('👉 Close the browser when done\n');

    // Create recordings directory
    await fs.mkdir('recordings', { recursive: true });

    const timestamp = Date.now();
    const outputFile = `recordings/codegen-${timestamp}.js`;
    const sessionFile = `recordings/session-${timestamp}.json`;

    // Run Playwright codegen
    const url = startUrl || 'about:blank';
    const command = `npx playwright codegen "${url}" --target javascript -o "${outputFile}"`;

    try {
      console.log(`Running: ${command}\n`);
      await execAsync(command, { 
        timeout: 3600000 // 1 hour max
      });
    } catch (error: any) {
      // User closed browser - this is normal, check if file was created
      if (error.code === 'SIGINT' || error.signal === 'SIGINT') {
        console.log('\n🛑 Recording stopped by user');
      } else if (!(await this.fileExists(outputFile))) {
        throw new Error('Recording was cancelled or failed');
      }
    }

    // Parse the generated code
    if (await this.fileExists(outputFile)) {
      console.log(`\n✅ Codegen file created: ${outputFile}`);
      
      const session = await this.parseCodegenFile(outputFile, startUrl);
      session.sourceFile = outputFile;
      
      // Save parsed session
      await fs.writeFile(
        sessionFile,
        JSON.stringify(session, null, 2),
        'utf-8'
      );
      
      console.log(`💾 Session saved: ${sessionFile}`);
      console.log(`📊 Recorded ${session.actions.length} actions`);
      
      return sessionFile;
    }

    throw new Error('No recording file was created');
  }

  /**
   * Parses Playwright codegen output into structured actions
   */
  async parseCodegenFile(filepath: string, baseUrl?: string): Promise<RecordedSession> {
    const content = await fs.readFile(filepath, 'utf-8');
    const actions: RecordedAction[] = [];
    
    const lines = content.split('\n');
    let currentUrl = baseUrl || '';

    console.log('\n📝 Parsing recorded actions:');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      // Extract navigation
      const gotoMatch = line.match(/page\.goto\(['"](.+?)['"]/);
      if (gotoMatch && gotoMatch[1]) {
        currentUrl = gotoMatch[1];
        actions.push({
          type: 'navigate',
          selector: '',
          url: currentUrl,
          timestamp: Date.now() + i * 100,
          description: `Navigate to ${currentUrl}`
        });
        console.log(`  ✓ Navigate to ${currentUrl}`);
        continue;
      }

      // Handle nested getByTestId().getByTestId() with click
      const nestedTestIdClickMatch = line.match(/page\.getByTestId\(['"](.+?)['"]\)\.getByTestId\(['"](.+?)['"]\)\.click\(\)/);
      if (nestedTestIdClickMatch && nestedTestIdClickMatch[1] && nestedTestIdClickMatch[2]) {
        const parent = nestedTestIdClickMatch[1];
        const child = nestedTestIdClickMatch[2];
        const selector = `getByTestId('${parent}').getByTestId('${child}')`;
        
        actions.push({
          type: 'click',
          selector: selector,
          timestamp: Date.now() + i * 100,
          description: `Click on ${child}`
        });
        console.log(`  ✓ Click on nested ${parent} > ${child}`);
        continue;
      }

      // Extract getByTestId, getByRole, etc. with click
      // Handle getByRole with name parameter: getByRole('button', { name: 'Continue' })
      const getByRoleWithNameMatch = line.match(/page\.getByRole\(['"](.+?)['"],\s*\{\s*name:\s*['"](.+?)['"]\s*\}\)/);
      if (getByRoleWithNameMatch && getByRoleWithNameMatch[1] && getByRoleWithNameMatch[2] && line.includes('.click()')) {
        const role = getByRoleWithNameMatch[1];
        const name = getByRoleWithNameMatch[2];
        const selector = `getByRole('${role}', { name: '${name}' })`;
        
        actions.push({
          type: 'click',
          selector: selector,
          timestamp: Date.now() + i * 100,
          description: `Click on getByRole "${role}" with name "${name}"`
        });
        console.log(`  ✓ Click on ${role} "${name}"`);
        continue;
      }
      
      // Handle other getBy methods
      const getByMatch = line.match(/page\.(getByTestId|getByRole|getByText|getByLabel)\(['"](.+?)['"]\)/);
      if (getByMatch && getByMatch[1] && getByMatch[2] && line.includes('.click()')) {
        const method = getByMatch[1];
        const value = getByMatch[2];
        // Get full selector chain if chained
        const fullChain = line.match(/page\.(.+?)\.click\(\)/);
        const selector = fullChain && fullChain[1] ? fullChain[1] : `${method}('${value}')`;
        
        actions.push({
          type: 'click',
          selector: selector,
          timestamp: Date.now() + i * 100,
          description: `Click on ${method} "${value}"`
        });
        console.log(`  ✓ Click on ${value}`);
        continue;
      }

      // Extract click
      const clickMatch = line.match(/page\.(?:click|locator)\(['"](.+?)['"]\)/);
      if (clickMatch && clickMatch[1] && !line.includes('fill') && !line.includes('select') && !line.includes('getBy')) {
        actions.push({
          type: 'click',
          selector: clickMatch[1],
          timestamp: Date.now() + i * 100,
          description: `Click on "${clickMatch[1]}"`
        });
        console.log(`  ✓ Click on "${clickMatch[1]}"`);
        continue;
      }

      // Extract fill - handle both .fill() and getByRole().fill() patterns
      const fillMatch = line.match(/\.fill\(['"](.+?)['"]\)/);
      if (fillMatch) {
        // Try to extract selector from the same line first
        let selector = 'input';
        
        // Check for nested getByTestId chains (e.g., page.getByTestId('x').getByTestId('y').fill())
        const nestedTestIdMatch = line.match(/page\.getByTestId\(['"](.+?)['"]\)\.getByTestId\(['"](.+?)['"]\)/);
        if (nestedTestIdMatch) {
          selector = `getByTestId('${nestedTestIdMatch[1]}').getByTestId('${nestedTestIdMatch[2]}')`;
        }
        // Check for getByRole with name on same line
        else {
          const getByRoleMatch = line.match(/getByRole\(['"](.+?)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
          if (getByRoleMatch) {
            // Check if chained (e.g., page.getByTestId().getByRole())
            const chainMatch = line.match(/page\.(.+?)\.getByRole/);
            if (chainMatch) {
              selector = `${chainMatch[1]}.getByRole('${getByRoleMatch[1]}', { name: '${getByRoleMatch[2]}' })`;
            } else {
              selector = `getByRole('${getByRoleMatch[1]}', { name: '${getByRoleMatch[2]}' })`;
            }
          } else {
            // Check for getByTestId on same line
            const getByTestIdMatch = line.match(/getByTestId\(['"](.+?)['"]\)/);
            if (getByTestIdMatch) {
              const chainMatch = line.match(/page\.(.+?)\.getByTestId/);
              if (chainMatch) {
                selector = `${chainMatch[1]}.getByTestId('${getByTestIdMatch[1]}')`;
              } else {
                selector = `getByTestId('${getByTestIdMatch[1]}')`;
              }
            } else {
              // Fallback: look at previous line
              for (let j = Math.max(0, i - 2); j < i; j++) {
                const prevLine = lines[j];
                if (prevLine) {
                  // Check for nested getByTestId in previous line
                  const prevNestedTestIdMatch = prevLine.match(/page\.getByTestId\(['"](.+?)['"]\)\.getByTestId\(['"](.+?)['"]\)/);
                  if (prevNestedTestIdMatch) {
                    selector = `getByTestId('${prevNestedTestIdMatch[1]}').getByTestId('${prevNestedTestIdMatch[2]}')`;
                    break;
                  }
                  const prevGetByRoleMatch = prevLine.match(/getByRole\(['"](.+?)['"],\s*\{\s*name:\s*['"](.+?)['"]/);
                  if (prevGetByRoleMatch && prevGetByRoleMatch[1] && prevGetByRoleMatch[2]) {
                    const prevChainMatch = prevLine.match(/page\.(.+?)\.getByRole/);
                    selector = prevChainMatch && prevChainMatch[1] ? 
                      `${prevChainMatch[1]}.getByRole('${prevGetByRoleMatch[1]}', { name: '${prevGetByRoleMatch[2]}' })` :
                      `getByRole('${prevGetByRoleMatch[1]}', { name: '${prevGetByRoleMatch[2]}' })`;
                    break;
                  }
                }
              }
            }
          }
        }
        
        const value = fillMatch[1];
        if (value) {
          actions.push({
            type: 'fill',
            selector,
            value: value,
            timestamp: Date.now() + i * 100,
            description: `Enter "${value}" into "${selector}"`
          });
          console.log(`  ✓ Fill "${value}" into field`);
        }
        continue;
      }

      // Extract select
      const selectMatch = line.match(/\.selectOption\(['"](.+?)['"]\)/);
      if (selectMatch && selectMatch[1]) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        const selectorMatch = prevLine ? prevLine.match(/page\.locator\(['"](.+?)['"]\)/) : null;
        const selector = selectorMatch && selectorMatch[1] ? selectorMatch[1] : 'select';
        
        actions.push({
          type: 'select',
          selector,
          value: selectMatch[1],
          timestamp: Date.now() + i * 100,
          description: `Select "${selectMatch[1]}" from "${selector}"`
        });
        console.log(`  ✓ Select "${selectMatch[1]}" from dropdown`);
        continue;
      }

      // Extract check/uncheck
      if (line.includes('.check()')) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        const selectorMatch = prevLine ? prevLine.match(/page\.locator\(['"](.+?)['"]\)/) : null;
        const selector = selectorMatch && selectorMatch[1] ? selectorMatch[1] : 'checkbox';
        
        actions.push({
          type: 'check',
          selector,
          timestamp: Date.now() + i * 100,
          description: `Check "${selector}"`
        });
        console.log(`  ✓ Check checkbox`);
        continue;
      }

      if (line.includes('.uncheck()')) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        const selectorMatch = prevLine ? prevLine.match(/page\.locator\(['"](.+?)['"]\)/) : null;
        const selector = selectorMatch && selectorMatch[1] ? selectorMatch[1] : 'checkbox';
        
        actions.push({
          type: 'uncheck',
          selector,
          timestamp: Date.now() + i * 100,
          description: `Uncheck "${selector}"`
        });
        console.log(`  ✓ Uncheck checkbox`);
        continue;
      }

      // Extract press key
      const pressMatch = line.match(/page\.press\(['"](.+?)['"],\s*['"](.+?)['"]/);
      if (pressMatch && pressMatch[1] && pressMatch[2]) {
        actions.push({
          type: 'press',
          selector: pressMatch[1],
          value: pressMatch[2],
          timestamp: Date.now() + i * 100,
          description: `Press ${pressMatch[2]} on "${pressMatch[1]}"`
        });
        console.log(`  ✓ Press key "${pressMatch[2]}"`);
        continue;
      }
    }

    console.log(`\n✅ Total: ${actions.length} actions parsed\n`);

    const baseUrlFromActions = actions.find(a => a.url)?.url || baseUrl || '';
    const baseUrlObj = baseUrlFromActions ? new URL(baseUrlFromActions) : null;

    return {
      id: `recording-${Date.now()}`,
      startTime: Date.now(),
      baseUrl: baseUrlObj ? baseUrlObj.origin : '',
      actions,
      sourceFile: filepath
    };
  }

  private async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }
}

