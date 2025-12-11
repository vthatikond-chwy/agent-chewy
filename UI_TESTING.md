# UI Test Recording and Execution Guide

## Overview
Agent-Chewy provides a fully automated UI test recording system that captures browser interactions and converts them into Cucumber/BDD test scenarios.

## Commands

### Recording UI Tests

#### Basic Recording
```bash
./fully-auto-record.sh "Test Name" "Test Description" [start_url]
```

**Examples:**
```bash
# Record a test starting from a specific URL
./fully-auto-record.sh "Chewy Test" "Complete checkout flow" "https://www-stg.chewy.net/"

# Record a test without specifying a start URL (starts from blank page)
./fully-auto-record.sh "Login Test" "Verify login works"
```

#### Recording with Clean Flag
The `--clean` flag removes existing test files before recording to ensure a fresh start:

```bash
./fully-auto-record.sh "Test Name" "Test Description" [start_url] --clean
```

**Examples:**
```bash
# Record and clean up old files
./fully-auto-record.sh "Chewy Test" "Complete flow" "https://www-stg.chewy.net/" --clean

# Clean flag can also be used without start URL
./fully-auto-record.sh "Login Test" "Login flow" --clean
```

### Running Tests

### Standalone Test Projects (Recommended)

Each test is generated as a standalone project in `generated/<test-name>/`:

```bash
cd generated/<test-name>
npm install
npx playwright install chromium
npm test
```

**Example:**
```bash
cd generated/chewy-test
npm install
npx playwright install chromium
npm test
```

### Run from Project Root

#### Run a Specific Feature File
```bash
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/<test-name>.feature --import src/steps/ui/<test-name>.steps.ts
```

**Example:**
```bash
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/chewy-test.feature --import src/steps/ui/chewy-test.steps.ts
```

#### Run All UI Tests
```bash
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/ --import src/steps/ui/
```

#### Run with Different Output Formats
```bash
# Progress format (default)
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/chewy-test.feature --import src/steps/ui/chewy-test.steps.ts --format progress

# JSON format
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/chewy-test.feature --import src/steps/ui/chewy-test.steps.ts --format json

# HTML report
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/chewy-test.feature --import src/steps/ui/chewy-test.steps.ts --format html:report.html
```

## Workflow

### Step 1: Record Your Test
1. Run the recording script:
   ```bash
   ./fully-auto-record.sh "My Test" "Test description" "https://example.com"
   ```

2. A browser window will open automatically
3. Perform your test actions in the browser:
   - Click buttons
   - Fill forms
   - Navigate pages
   - Interact with elements

4. Close the browser when done

### Step 2: Review Generated Files
The script automatically generates:
- **Feature file**: `features/ui/<test-name>.feature` - Contains the Cucumber/Gherkin scenario
- **Step definitions**: `src/steps/ui/<test-name>.steps.ts` - Contains the Playwright code

### Step 3: Run the Test
```bash
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/<test-name>.feature --import src/steps/ui/<test-name>.steps.ts
```

## File Locations

- **Standalone test projects**: `generated/<test-name>/` - Self-contained test projects with package.json
- **Recordings**: `recordings/codegen-*.js` - Raw Playwright Codegen output
- **Feature files**: `features/ui/*.feature` - Cucumber feature files (also copied to generated projects)
- **Step definitions**: `src/steps/ui/*.steps.ts` - TypeScript step definitions (also copied to generated projects)

## Tips

1. **Use descriptive test names**: Make test names clear and specific
2. **Clean before re-recording**: Use `--clean` flag when updating existing tests
3. **Wait for elements**: The generator automatically adds waits, but you can add explicit waits if needed
4. **Review generated code**: Always review the generated step definitions for accuracy
5. **Handle dynamic content**: For elements with dynamic IDs, the generator uses `.first()` for ambiguous selectors

## Troubleshooting

### Test fails with "strict mode violation"
- The generator automatically adds `.first()` to ambiguous selectors like `account-link`
- If you still see errors, check the step definition and ensure it uses `.first()` or a more specific selector

### Missing steps in feature file
- Ensure you click elements slowly and deliberately during recording
- Some actions (like password entry) may need to be clicked first before typing

### Browser doesn't open
- Check that Playwright is installed: `npx playwright --version`
- Install browsers if needed: `npx playwright install`

## Examples

### Complete Example: Login Flow
```bash
# 1. Record the test
./fully-auto-record.sh "Login Flow" "User login and logout" "https://www-stg.chewy.net/" --clean

# 2. Review generated files
cat features/ui/login-flow.feature
cat src/steps/ui/login-flow.steps.ts

# 3. Run the test (standalone project - recommended)
cd generated/login-flow
npm install
npx playwright install chromium
npm test

# OR run from project root
NODE_OPTIONS="--import tsx" npx cucumber-js features/ui/login-flow.feature --import src/steps/ui/login-flow.steps.ts
```

### Updating an Existing Test
```bash
# Clean old files and re-record
./fully-auto-record.sh "Chewy Test" "Updated flow" "https://www-stg.chewy.net/" --clean
```

