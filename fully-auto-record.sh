#!/bin/bash

# Fully Automated UI Test Recording
# Usage: ./fully-auto-record.sh "Test Name" "Test Description" [start_url]
#
# Examples:
#   ./fully-auto-record.sh "Chewy Test" "Complete checkout flow"
#   ./fully-auto-record.sh "Login Test" "Verify login works" "https://www-stg.chewy.net/"

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

# Convert test name to filename (lowercase, replace spaces with dashes)
FILENAME=$(echo "$TEST_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🎬 FULLY AUTOMATED UI TEST RECORDER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${GREEN}Test Name:${NC} $TEST_NAME"
echo -e "   ${GREEN}Description:${NC} $TEST_DESC"
echo -e "   ${GREEN}Output:${NC} $FILENAME"
if [ -n "$START_URL" ]; then
  echo -e "   ${GREEN}Start URL:${NC} $START_URL"
fi
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   STEP 1: RECORDING${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${BLUE}👉 Browser will open - perform your test actions${NC}"
echo -e "   ${BLUE}👉 Close the browser when done${NC}"
echo ""

# Create directories
mkdir -p recordings features/ui src/steps/ui

# Generate timestamp for unique filenames
TIMESTAMP=$(date +%s)
CODEGEN_FILE="recordings/codegen-${TIMESTAMP}.js"
SESSION_FILE="recordings/session-${TIMESTAMP}.json"

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
import { CodegenRecorder } from './src/agents/ui-agent/codegenRecorder.js';
import { RecordingToGherkinGenerator } from './src/agents/ui-agent/recordingToGherkin.js';
import * as fs from 'fs/promises';

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
  
  // Save files
  await fs.writeFile('features/ui/$FILENAME.feature', feature);
  await fs.writeFile('src/steps/ui/$FILENAME.steps.ts', result.steps);
  
  console.log('✅ Feature: features/ui/$FILENAME.feature');
  console.log('✅ Steps: src/steps/ui/$FILENAME.steps.ts');
}

convert().catch(e => { console.error(e); process.exit(1); });
"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   STEP 3: RUNNING TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Run the tests
NODE_OPTIONS="--import tsx" npx cucumber-js "features/ui/$FILENAME.feature" \
  --import "src/steps/ui/$FILENAME.steps.ts" \
  --format progress || true

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✨ COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "   ${BLUE}Generated files:${NC}"
echo -e "   📄 features/ui/$FILENAME.feature"
echo -e "   📝 src/steps/ui/$FILENAME.steps.ts"
echo ""
echo -e "   ${BLUE}To re-run tests:${NC}"
echo -e "   NODE_OPTIONS=\"--import tsx\" npx cucumber-js features/ui/$FILENAME.feature --import src/steps/ui/$FILENAME.steps.ts"
echo ""

