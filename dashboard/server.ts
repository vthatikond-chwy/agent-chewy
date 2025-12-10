/**
 * Dashboard Server
 * 
 * Simple Express server to serve the dashboard and provide API endpoints
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const app = express();
const PORT = 3000;

// Persistent execution history (saved to file)
const HISTORY_FILE = path.join(process.cwd(), 'dashboard/.execution-history.json');

function loadExecutionHistory(): Map<string, any[]> {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.log('No previous execution history found');
  }
  return new Map();
}

function saveExecutionHistory() {
  const data: Record<string, any[]> = {};
  executionHistory.forEach((v, k) => data[k] = v);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

const executionHistory = loadExecutionHistory();

// Serve static files
app.use(express.static(path.join(import.meta.dirname, '.')));
app.use(express.json());

// API: Get teams
app.get('/api/teams', (req, res) => {
  const teamsDir = path.join(process.cwd(), 'swagger/teams');
  const teams = fs.readdirSync(teamsDir).filter(f => {
    return fs.statSync(path.join(teamsDir, f)).isDirectory();
  });
  res.json(teams);
});

// API: Get scenarios for a team
app.get('/api/teams/:team/scenarios', (req, res) => {
  const { team } = req.params;
  const featuresDir = path.join(process.cwd(), 'features/api', team);
  
  if (!fs.existsSync(featuresDir)) {
    return res.json([]);
  }

  const scenarios: any[] = [];
  
  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDir(filePath);
      } else if (file.endsWith('.feature')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const nameMatch = content.match(/Scenario(?:\s+Outline)?:\s*(.+)/);
        const tagsMatch = content.match(/@\w+/g);
        
        // Parse steps with data tables
        const steps: any[] = [];
        const lines = content.split('\n');
        let currentStep: any = null;
        let dataTableLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          
          // Check if this is a data table row
          if (trimmed.startsWith('|')) {
            dataTableLines.push(trimmed);
            continue;
          }
          
          // If we were collecting data table and now hit non-table line, attach to previous step
          if (dataTableLines.length > 0 && currentStep) {
            currentStep.dataTable = dataTableLines.join('\n');
            dataTableLines = [];
          }
          
          // Parse step keywords
          if (trimmed.startsWith('Given ')) {
            currentStep = { type: 'Given', text: trimmed.substring(6) };
            steps.push(currentStep);
          } else if (trimmed.startsWith('When ')) {
            currentStep = { type: 'When', text: trimmed.substring(5) };
            steps.push(currentStep);
          } else if (trimmed.startsWith('Then ')) {
            currentStep = { type: 'Then', text: trimmed.substring(5) };
            steps.push(currentStep);
          } else if (trimmed.startsWith('And ')) {
            currentStep = { type: 'And', text: trimmed.substring(4) };
            steps.push(currentStep);
          }
        }
        
        // Attach any remaining data table to last step
        if (dataTableLines.length > 0 && currentStep) {
          currentStep.dataTable = dataTableLines.join('\n');
        }
        
        // Parse examples table if present
        const examplesMatch = content.match(/Examples:[\s\S]*?(\|[\s\S]*?)(?=\n\n|$)/);
        
        scenarios.push({
          id: Buffer.from(filePath).toString('base64'),
          name: nameMatch ? nameMatch[1].trim() : file.replace('.feature', ''),
          file: filePath,
          tags: tagsMatch || [],
          steps,
          examples: examplesMatch ? examplesMatch[1].trim() : null,
          content,
          status: 'ready',
          team
        });
      }
    }
  }
  
  scanDir(featuresDir);
  res.json(scenarios);
});

// API: Get single scenario details
app.get('/api/scenarios/:id', (req, res) => {
  const { id } = req.params;
  try {
    const filePath = Buffer.from(id, 'base64').toString('utf-8');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, file: filePath });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// API: Run single scenario
app.post('/api/scenarios/:id/run', async (req, res) => {
  const { id } = req.params;
  const startTime = Date.now();
  
  try {
    const filePath = Buffer.from(id, 'base64').toString('utf-8');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    // Extract team from file path (e.g., features/api/avs/...)
    const teamMatch = filePath.match(/features\/api\/(\w+)\//);
    const team = teamMatch ? teamMatch[1] : 'unknown';
    
    // Extract scenario name from file
    const content = fs.readFileSync(filePath, 'utf-8');
    const nameMatch = content.match(/Scenario(?:\s+Outline)?:\s*(.+)/);
    const scenarioName = nameMatch ? nameMatch[1].trim() : path.basename(filePath, '.feature');
    
    const cmd = `npx cucumber-js "${filePath}" --require "src/steps/**/*.ts" --import tsx`;
    
    const output = execSync(cmd, { 
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: '--import tsx' }
    });
    
    const duration = Date.now() - startTime;
    const passed = !output.includes('failed');
    
    // Parse request/response from output if available
    let requestData = null;
    let responseData = null;
    let requestUrl = null;
    let responseStatus = null;
    try {
      // Look for request URL
      const urlMatch = output.match(/POST\s+(https?:\/\/[^\s]+)/i);
      if (urlMatch) requestUrl = urlMatch[1];
      
      // Look for request body (multi-line JSON after "Request Body:")
      const reqMatch = output.match(/Request Body:\s*(\{[\s\S]*?\})\n/);
      if (reqMatch) requestData = reqMatch[1];
      
      // Look for response status
      const statusMatch = output.match(/Status:\s*(\d+)/);
      if (statusMatch) responseStatus = statusMatch[1];
      
      // Look for response body (multi-line JSON after "Response Body:")
      const resMatch = output.match(/Response Body:\s*(\{[\s\S]*?\})\n/);
      if (resMatch) responseData = resMatch[1];
    } catch (e) {}
    
    // Record execution
    const execution = {
      id: Date.now().toString(),
      name: scenarioName,
      date: new Date().toLocaleString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      passed: passed ? 1 : 0,
      failed: passed ? 0 : 1,
      status: passed ? 'passed' : 'failed',
      output: output.substring(0, 5000), // Save output (truncated)
      requestUrl,
      request: requestData,
      responseStatus,
      response: responseData
    };
    
    if (!executionHistory.has(team)) {
      executionHistory.set(team, []);
    }
    executionHistory.get(team)!.unshift(execution);
    if (executionHistory.get(team)!.length > 50) {
      executionHistory.get(team)!.pop();
    }
    saveExecutionHistory();
    
    res.json({ 
      success: true, 
      passed,
      duration: `${(duration / 1000).toFixed(1)}s`,
      output 
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Extract team from file path
    let team = 'unknown';
    let scenarioName = 'Unknown Scenario';
    try {
      const filePath = Buffer.from(id, 'base64').toString('utf-8');
      const teamMatch = filePath.match(/features\/api\/(\w+)\//);
      team = teamMatch ? teamMatch[1] : 'unknown';
      scenarioName = path.basename(filePath, '.feature');
    } catch (e) {}
    
    // Record failed execution
    const errorOutput = error.stdout || error.stderr || error.message || '';
    const execution = {
      id: Date.now().toString(),
      name: scenarioName,
      date: new Date().toLocaleString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      passed: 0,
      failed: 1,
      status: 'failed',
      output: errorOutput.substring(0, 5000),
      error: error.message
    };
    
    if (!executionHistory.has(team)) {
      executionHistory.set(team, []);
    }
    executionHistory.get(team)!.unshift(execution);
    saveExecutionHistory();
    
    res.json({ 
      success: false, 
      passed: false,
      duration: `${(duration / 1000).toFixed(1)}s`,
      error: error.message, 
      output: error.stdout || error.stderr || '' 
    });
  }
});

// API: Get executions for a team
app.get('/api/teams/:team/executions', (req, res) => {
  const { team } = req.params;
  const executions = executionHistory.get(team) || [];
  res.json(executions);
});

// API: Get reports for a team (same as executions but more detailed)
app.get('/api/teams/:team/reports', (req, res) => {
  const { team } = req.params;
  const reports = executionHistory.get(team) || [];
  res.json(reports);
});

// API: Clear reports for a team
app.delete('/api/teams/:team/reports', (req, res) => {
  const { team } = req.params;
  executionHistory.set(team, []);
  saveExecutionHistory();
  res.json({ success: true });
});

// API: Get context for a team
app.get('/api/teams/:team/context', (req, res) => {
  const { team } = req.params;
  const contextPath = path.join(process.cwd(), 'swagger/teams', team, 'context/api-context.json');
  
  if (!fs.existsSync(contextPath)) {
    return res.json({ error: 'Context not found' });
  }

  const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  
  // Return summary
  res.json({
    version: context.version,
    lastUpdated: context.lastUpdated,
    testPatterns: context.endpoints?.[0]?.testPatterns?.length || 0,
    businessRules: context.domain?.businessRules?.length || 0,
    edgeCases: context.domain?.edgeCases?.length || 0,
    responseCodes: context.endpoints?.[0]?.responseCodeBehaviors || []
  });
});

// API: Generate test
app.post('/api/generate', async (req, res) => {
  const { team, input, runTests } = req.body;
  
  try {
    const runFlag = runTests ? '' : '--no-run';
    const cmd = `npx tsx src/cli/index.ts api test -t ${team} -i "${input}" ${runFlag}`;
    
    const output = execSync(cmd, { 
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    res.json({ success: true, output });
  } catch (error: any) {
    res.json({ success: false, error: error.message, output: error.stdout || '' });
  }
});

// API: Validate context
app.post('/api/validate/:team', async (req, res) => {
  const { team } = req.params;
  const { fix } = req.body;
  
  try {
    const fixFlag = fix ? '--fix' : '';
    const cmd = `npx tsx src/cli/index.ts api validate -t ${team} ${fixFlag}`;
    
    const output = execSync(cmd, { 
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    res.json({ success: true, output });
  } catch (error: any) {
    res.json({ success: false, error: error.message, output: error.stdout || '' });
  }
});

// API: Clear all scenarios for a team
app.delete('/api/teams/:team/scenarios', (req, res) => {
  const { team } = req.params;
  
  try {
    // Clear feature files
    const featuresDir = path.join(process.cwd(), 'features/api', team, 'verification');
    if (fs.existsSync(featuresDir)) {
      const files = fs.readdirSync(featuresDir);
      let deleted = 0;
      for (const file of files) {
        if (file.endsWith('.feature')) {
          fs.unlinkSync(path.join(featuresDir, file));
          deleted++;
        }
      }
      console.log(`Deleted ${deleted} feature files from ${featuresDir}`);
    }
    
    // Clear step definition files
    const stepsDir = path.join(process.cwd(), 'src/steps/api', team);
    if (fs.existsSync(stepsDir)) {
      const files = fs.readdirSync(stepsDir);
      let deleted = 0;
      for (const file of files) {
        if (file.endsWith('.steps.ts')) {
          fs.unlinkSync(path.join(stepsDir, file));
          deleted++;
        }
      }
      console.log(`Deleted ${deleted} step files from ${stepsDir}`);
    }
    
    res.json({ success: true, message: 'All scenarios cleared' });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// API: Run tests
app.post('/api/test/:team', async (req, res) => {
  const { team } = req.params;
  const startTime = Date.now();
  
  try {
    const cmd = `npm run test:${team}`;
    
    const output = execSync(cmd, { 
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    // Parse results
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const duration = Date.now() - startTime;
    
    // Record execution
    const execution = {
      name: `Test Run - ${team.toUpperCase()}`,
      date: new Date().toLocaleString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      passed,
      failed,
      status: failed === 0 ? 'passed' : 'failed'
    };
    
    if (!executionHistory.has(team)) {
      executionHistory.set(team, []);
    }
    executionHistory.get(team)!.unshift(execution);
    // Keep only last 20 executions
    if (executionHistory.get(team)!.length > 20) {
      executionHistory.get(team)!.pop();
    }
    saveExecutionHistory();
    
    res.json({ 
      success: true, 
      passed,
      failed,
      output 
    });
  } catch (error: any) {
    // Still record failed execution
    const duration = Date.now() - startTime;
    const execution = {
      name: `Test Run - ${team.toUpperCase()}`,
      date: new Date().toLocaleString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      passed: 0,
      failed: 1,
      status: 'error'
    };
    
    if (!executionHistory.has(team)) {
      executionHistory.set(team, []);
    }
    executionHistory.get(team)!.unshift(execution);
    saveExecutionHistory();
    
    res.json({ success: false, error: error.message, output: error.stdout || '' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🐕 Agent Chewy Dashboard                                ║
║                                                           ║
║   Dashboard: http://localhost:${PORT}                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

