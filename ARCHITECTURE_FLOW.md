# Agent Chewy - Architecture Flow

## API Test Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    API TEST GENERATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

INPUT: Natural Language + Team Name + Swagger Spec
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: LOAD CONTEXT                                            │
│ ─────────────────────────────────────────────────────────────── │
│ • Load context library from swagger/teams/{team}/context/       │
│ • OR Build context from source code repository                  │
│ • Extract: test patterns, business rules, response codes        │
│ • Output: ApiContext object with domain knowledge               │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: LOAD SCHEMA                                             │
│ ─────────────────────────────────────────────────────────────── │
│ • Parse Swagger/OpenAPI specification                           │
│ • Extract: endpoints, request/response schemas, parameters      │
│ • Validate schema structure                                     │
│ • Output: Parsed Swagger spec with endpoint details             │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: NLP PROCESSING                                          │
│ ─────────────────────────────────────────────────────────────── │
│ • Parse natural language input                                  │
│ • Match NL to context library (test patterns, rules)            │
│ • Identify relevant endpoints from schema                       │
│ • Extract: scenario type, expected response, test data hints    │
│ • Output: TestPlan with intent and requirements                 │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: TEST GENERATION                                         │
│ ─────────────────────────────────────────────────────────────── │
│ • Generate Cucumber/Gherkin feature files                       │
│   - Use context library for test data                           │
│   - Use schema for request structure                            │
│   - Use NLP plan for scenario logic                             │
│ • Generate TypeScript step definitions                          │
│   - HTTP client code (Axios)                                    │
│   - Assertions based on expected response                       │
│   - Schema validation                                           │
│ • Output: features/api/*.feature + src/steps/api/*.steps.ts     │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: EXECUTION (Optional)                                    │
│ ─────────────────────────────────────────────────────────────── │
│ • Run Cucumber tests                                            │
│ • Execute HTTP requests to real API                             │
│ • Validate responses against schema                             │
│ • Check assertions                                              │
│ • Generate test reports                                         │
│ • Output: Test results, pass/fail status, reports               │
└─────────────────────────────────────────────────────────────────┘
```

## UI Test Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI TEST GENERATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

INPUT: Test Name + Description + Start URL (optional)
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: RECORD ACTIONS                                          │
│ ─────────────────────────────────────────────────────────────── │
│ • Launch Playwright Codegen                                     │
│ • Open browser window                                           │
│ • User performs actions (click, fill, navigate, etc.)           │
│ • Codegen captures all interactions in real-time                │
│ • Output: Raw Playwright codegen JavaScript file                │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PARSE RECORDING                                         │
│ ─────────────────────────────────────────────────────────────── │
│ • Parse codegen JavaScript file                                 │
│ • Extract structured actions (navigate, click, fill, etc.)      │
│ • Identify element selectors and values                         │
│ • Capture page context and navigation flow                      │
│ • Output: RecordedSession object with action list               │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: CONVERT TO GHERKIN                                      │
│ ─────────────────────────────────────────────────────────────── │
│ • Transform actions to business-readable Gherkin                │
│ • Group actions into logical steps (Given/When/Then)            │
│ • Generate human-readable step descriptions                     │
│ • Create Cucumber feature file structure                        │
│ • Output: Cucumber/Gherkin feature file                         │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: GENERATE STEP DEFINITIONS                               │
│ ─────────────────────────────────────────────────────────────── │
│ • Generate TypeScript step definitions                          │
│ • Convert Gherkin steps to Playwright automation code           │
│ • Add element locators with self-healing support                │
│ • Include proper waits and error handling                       │
│ • Output: TypeScript step definitions file                      │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: CREATE STANDALONE PROJECT                               │
│ ─────────────────────────────────────────────────────────────── │
│ • Create generated/<test-name>/ directory                       │
│ • Copy feature and step definition files                        │
│ • Generate package.json with dependencies                       │
│ • Create tsconfig.json                                          │
│ • Generate README with instructions                             │
│ • Output: Complete standalone test project                      │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: EXECUTE TESTS                                           │
│ ─────────────────────────────────────────────────────────────── │
│ • Run Cucumber test runner                                      │
│ • Execute Playwright browser automation                         │
│ • Perform recorded actions in browser                           │
│ • Use self-healing if locators fail                             │
│ • Capture screenshots/videos                                    │
│ • Generate test reports                                         │
│ • Output: Test results, pass/fail status, artifacts             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Diagram

### API Test Components

```
┌──────────────┐
│   CLI/API    │
│   Entry      │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              ApiTestOrchestrator                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Context  │  │ Swagger  │  │   NLP    │  │ Generator│   │
│  │ Loader   │→ │  Parser  │→ │  Client  │→ │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Output Files                                     │
│  • features/api/*.feature                                    │
│  • src/steps/api/*.steps.ts                                  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Execution                                   │
│  • Cucumber Runner                                           │
│  • HTTP Client (Axios)                                       │
│  • Schema Validator                                          │
└─────────────────────────────────────────────────────────────┘
```

### UI Test Components

```
┌──────────────┐
│   Script     │
│ fully-auto-  │
│ record.sh    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              CodegenRecorder                                 │
│  • Playwright Codegen                                        │
│  • Browser Automation                                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              RecordingToGherkinGenerator                     │
│  • Parse Actions                                             │
│  • Generate Gherkin                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Step Definition Generator                       │
│  • Generate TypeScript                                       │
│  • Add Playwright Code                                       │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Standalone Project Creator                      │
│  • Create directory structure                                │
│  • Generate config files                                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Execution                                   │
│  • Cucumber Runner                                           │
│  • UIAgent (Playwright)                                      │
│  • Self-Healing Engine                                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

### API Tests
```
Natural Language Input
    ↓
Context Library (Domain Knowledge)
    ↓
Swagger Schema (API Structure)
    ↓
NLP Processing (Intent Understanding)
    ↓
Test Generation (Cucumber + TypeScript)
    ↓
Test Execution (HTTP Requests + Validation)
```

### UI Tests
```
User Actions (Browser Interactions)
    ↓
Recording (Playwright Codegen)
    ↓
Parsing (Structured Actions)
    ↓
Gherkin Conversion (Business Language)
    ↓
Step Definition Generation (Playwright Code)
    ↓
Standalone Project Creation
    ↓
Test Execution (Browser Automation)
```

