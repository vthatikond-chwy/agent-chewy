# Agent-Chewy

Record browser actions → Auto-generate Cucumber tests

## Quick Start

### UI Test Recording
```bash
# Record a new test
./fully-auto-record.sh "Test Name" "Description" "https://example.com"

# Record with clean flag (removes old test files)
./fully-auto-record.sh "Test Name" "Description" "https://example.com" --clean

# Run a recorded test (standalone project - recommended)
cd generated/<test-name>
npm install
npx playwright install chromium
npm test

# Or run from project root
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/<test-name>.feature --import src/steps/ui/<test-name>.steps.ts
```

### API Test Generation
```bash
# Generate API tests from natural language
npm run api:generate

# Or use the CLI
npx tsx src/cli/index.ts api generate
```

See [UI_TESTING.md](./UI_TESTING.md) for detailed UI testing documentation.

## Speed: 15 seconds per test
## ROI: 750-1,000 hours saved/year