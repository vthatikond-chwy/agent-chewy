#!/usr/bin/env node

/**
 * Generate test data JSON for GitHub Pages
 * Scans feature files and creates a JSON file with test metadata
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function scanFeatureFiles(dir, type) {
  const tests = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subTests = await scanFeatureFiles(fullPath, type);
        tests.push(...subTests);
      } else if (entry.name.endsWith('.feature')) {
        // Read feature file
        const content = await fs.readFile(fullPath, 'utf-8');
        const relativePath = path.relative(rootDir, fullPath);
        
        // Extract feature name
        const featureMatch = content.match(/^Feature:\s*(.+)$/m);
        const featureName = featureMatch ? featureMatch[1].trim() : path.basename(entry.name, '.feature');
        
        // Extract scenarios
        const scenarioMatches = content.matchAll(/Scenario:\s*(.+)$/gm);
        const scenarios = Array.from(scenarioMatches).map(m => m[1].trim());
        
        // Determine team from path
        const teamMatch = relativePath.match(/features\/(?:api|ui)\/([^\/]+)/);
        const team = teamMatch ? teamMatch[1] : null;
        
        // Default status (could be enhanced to read from test results)
        const status = 'pending';
        
        tests.push({
          name: featureName,
          path: relativePath,
          team: team || type,
          type: type,
          scenarios: scenarios.length,
          status: status
        });
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    console.warn(`Warning: Could not scan ${dir}:`, error.message);
  }
  
  return tests;
}

async function generatePagesData() {
  console.log('📊 Generating GitHub Pages test data...\n');
  
  // Scan API tests
  console.log('Scanning API tests...');
  const apiDir = path.join(rootDir, 'features', 'api');
  const apiTests = await scanFeatureFiles(apiDir, 'api');
  console.log(`  Found ${apiTests.length} API test files`);
  
  // Scan UI tests
  console.log('Scanning UI tests...');
  const uiDir = path.join(rootDir, 'features', 'ui');
  const uiTests = await scanFeatureFiles(uiDir, 'ui');
  console.log(`  Found ${uiTests.length} UI test files`);
  
  // Create data structure
  const data = {
    generated: new Date().toISOString(),
    api: {
      total: apiTests.length,
      passed: apiTests.filter(t => t.status === 'passed').length,
      failed: apiTests.filter(t => t.status === 'failed').length,
      pending: apiTests.filter(t => t.status === 'pending').length,
      teams: [...new Set(apiTests.map(t => t.team))],
      tests: apiTests
    },
    ui: {
      total: uiTests.length,
      passed: uiTests.filter(t => t.status === 'passed').length,
      failed: uiTests.filter(t => t.status === 'failed').length,
      pending: uiTests.filter(t => t.status === 'pending').length,
      tests: uiTests
    }
  };
  
  // Write to docs directory
  const outputPath = path.join(rootDir, 'docs', 'test-data.json');
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`\n✅ Test data written to: ${outputPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   API Tests: ${data.api.total} (${data.api.passed} passed, ${data.api.failed} failed, ${data.api.pending} pending)`);
  console.log(`   UI Tests: ${data.ui.total} (${data.ui.passed} passed, ${data.ui.failed} failed, ${data.ui.pending} pending)`);
}

generatePagesData().catch(console.error);

