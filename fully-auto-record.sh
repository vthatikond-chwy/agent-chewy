#!/bin/bash

# Fully Automated UI Test Recording
# Usage: ./fully-auto-record.sh "Test Name" "Test Description" [start_url] [--clean]
#
# Examples:
#   ./fully-auto-record.sh "Chewy Test" "Complete checkout flow"
#   ./fully-auto-record.sh "Login Test" "Verify login works" "https://www-stg.chewy.net/"
#   ./fully-auto-record.sh "Chewy Test" "Complete flow" "https://www-stg.chewy.net/" --clean
#
# Output Structure:
#   generated/<test-name>/
#     recordings/       - Raw Playwright recordings
#     features/         - Cucumber feature files
#     src/steps/        - TypeScript step definitions
#     package.json      - Dependencies and npm scripts
#     tsconfig.json     - TypeScript config
#     README.md         - Test documentation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
TEST_NAME="${1:-recorded-test}"
TEST_DESC="${2:-Automated test from browser recording}"
START_URL="${3:-}"
CLEAN_FLAG="${4:-}"

# Check for clean flag
CLEAN_OLD_TESTS=false
if [[ "$CLEAN_FLAG" == "--clean" ]] || [[ "$CLEAN_FLAG" == "-c" ]] || [[ "$3" == "--clean" ]] || [[ "$3" == "-c" ]]; then
  CLEAN_OLD_TESTS=true
  # If clean flag was in position 3, shift START_URL
  if [[ "$3" == "--clean" ]] || [[ "$3" == "-c" ]]; then
    START_URL=""
  fi
fi

# Convert test name to filename (lowercase, replace spaces with dashes)
FILENAME=$(echo "$TEST_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

# Define output directory - everything goes here
OUTPUT_DIR="generated/$FILENAME"

# Clean up old test files if flag is set
if [ "$CLEAN_OLD_TESTS" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning up old test files...${NC}"
  rm -rf "$OUTPUT_DIR"
  echo -e "${GREEN}✅ Old test files removed${NC}"
  echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🎬 FULLY AUTOMATED UI TEST RECORDER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${GREEN}Test Name:${NC} $TEST_NAME"
echo -e "   ${GREEN}Description:${NC} $TEST_DESC"
echo -e "   ${GREEN}Output:${NC} $OUTPUT_DIR/"
if [ -n "$START_URL" ]; then
  echo -e "   ${GREEN}Start URL:${NC} $START_URL"
fi
if [ "$CLEAN_OLD_TESTS" = true ]; then
  echo -e "   ${GREEN}Clean Mode:${NC} Enabled"
fi
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   STEP 1: RECORDING${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${BLUE}👉 Browser will open - perform your test actions${NC}"
echo -e "   ${BLUE}👉 Close the browser when done${NC}"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR/recordings"
mkdir -p "$OUTPUT_DIR/features"
mkdir -p "$OUTPUT_DIR/src/steps"

# Generate timestamp for unique filenames
TIMESTAMP=$(date +%s)
CODEGEN_FILE="$OUTPUT_DIR/recordings/codegen-${TIMESTAMP}.js"
SESSION_FILE="$OUTPUT_DIR/recordings/session-${TIMESTAMP}.json"

# Run Playwright codegen
if [ -n "$START_URL" ]; then
  npx playwright codegen "$START_URL" --target javascript -o "$CODEGEN_FILE"
else
  npx playwright codegen --target javascript -o "$CODEGEN_FILE"
fi

# Check if recording was created
if [ ! -f "$CODEGEN_FILE" ]; then
  echo -e "${RED}❌ Recording was cancelled or failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Recording saved: $CODEGEN_FILE${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   STEP 2: CONVERTING TO CUCUMBER TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Run the conversion using Node.js
npx tsx -e "
import { CodegenRecorder } from './src/agents/ui-agent/codegenRecorder.ts';
import { RecordingToGherkinGenerator } from './src/agents/ui-agent/recordingToGherkin.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

async function convert() {
  const recorder = new CodegenRecorder();
  const generator = new RecordingToGherkinGenerator();
  
  // Parse the recording
  const session = await recorder.parseCodegenFile('$CODEGEN_FILE', '$START_URL');
  
  // Save session
  await fs.writeFile('$SESSION_FILE', JSON.stringify(session, null, 2));
  
  // Generate tests
  const result = await generator.generate(session);
  
  // Customize feature with provided name and description
  let feature = result.feature;
  feature = feature.replace('Feature: Recorded User Flow', 'Feature: $TEST_NAME');
  feature = feature.replace('Automated test generated from browser recording', '$TEST_DESC');
  
  const testDir = '$OUTPUT_DIR';
  
  // Save feature and step files
  await fs.writeFile(path.join(testDir, 'features', '$FILENAME.feature'), feature);
  await fs.writeFile(path.join(testDir, 'src', 'steps', '$FILENAME.steps.ts'), result.steps);
  
  // Create package.json for standalone test
  const packageJson = {
    name: '$FILENAME',
    version: '1.0.0',
    description: '$TEST_DESC',
    type: 'module',
    scripts: {
      test: 'NODE_OPTIONS=\"--import tsx\" npx cucumber-js features/$FILENAME.feature --import src/steps/$FILENAME.steps.ts --format progress',
      'test:json': 'NODE_OPTIONS=\"--import tsx\" npx cucumber-js features/$FILENAME.feature --import src/steps/$FILENAME.steps.ts --format json',
      'test:html': 'NODE_OPTIONS=\"--import tsx\" npx cucumber-js features/$FILENAME.feature --import src/steps/$FILENAME.steps.ts --format html:report.html'
    },
    dependencies: {
      '@cucumber/cucumber': '^10.0.0',
      'playwright': '^1.40.0',
      'tsx': '^4.7.0',
      'typescript': '^5.3.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0'
    }
  };
  
  await fs.writeFile(
    path.join(testDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      resolveJsonModule: true
    },
    include: ['src/**/*']
  };
  
  await fs.writeFile(
    path.join(testDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
  
  // Create README for the test
  const readmeLines = [
    '# $TEST_NAME',
    '',
    '$TEST_DESC',
    '',
    '## Quick Start',
    '',
    'npm install',
    'npx playwright install chromium',
    'npm test',
    '',
    '## Project Structure',
    '',
    'recordings/     - Raw Playwright recordings',
    'features/       - Cucumber feature files', 
    'src/steps/      - TypeScript step definitions',
    '',
    '## Run Options',
    '',
    'npm test           - Run with progress output',
    'npm run test:json  - Run with JSON output',
    'npm run test:html  - Run with HTML report'
  ];
  
  await fs.writeFile(path.join(testDir, 'README.md'), readmeLines.join('\\n'));
  
  console.log('');
  console.log('✅ Test project created: $OUTPUT_DIR/');
  console.log('');
  console.log('   📁 $OUTPUT_DIR/');
  console.log('   ├── recordings/');
  console.log('   │   ├── codegen-$TIMESTAMP.js');
  console.log('   │   └── session-$TIMESTAMP.json');
  console.log('   ├── features/');
  console.log('   │   └── $FILENAME.feature');
  console.log('   ├── src/steps/');
  console.log('   │   └── $FILENAME.steps.ts');
  console.log('   ├── package.json');
  console.log('   ├── tsconfig.json');
  console.log('   └── README.md');
}

convert().catch(e => { console.error(e); process.exit(1); });
"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   STEP 3: RUNNING TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Run the tests from the generated directory
cd "$OUTPUT_DIR"
NODE_OPTIONS="--import tsx" npx cucumber-js "features/$FILENAME.feature" \
  --import "src/steps/$FILENAME.steps.ts" \
  --format progress || true
cd - > /dev/null

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✨ COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${BLUE}All files in:${NC} ${GREEN}$OUTPUT_DIR/${NC}"
echo ""
echo -e "   ${BLUE}To run tests:${NC}"
echo -e "   ${YELLOW}cd $OUTPUT_DIR${NC}"
echo -e "   ${YELLOW}npm install${NC}"
echo -e "   ${YELLOW}npx playwright install chromium${NC}"
echo -e "   ${YELLOW}npm test${NC}"
echo ""
