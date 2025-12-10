# AVS Team - Address Validation Service

## Directory Structure

```
avs/
├── avs-api.json           # Swagger/OpenAPI specification
├── config.json            # Environment configuration
├── context/
│   └── api-context.json   # Context library (46 test patterns, 74 rules)
└── README.md
```

## Context Library

The `context/api-context.json` contains comprehensive domain knowledge extracted from the AVS service source code:

- **46 test patterns** - Proven working addresses for each response code
- **74 business rules** - Validation logic and triggers
- **5 response codes** - VERIFIED, CORRECTED, NOT_VERIFIED, STREET_PARTIAL, PREMISES_PARTIAL

### Rebuilding Context

To rebuild context from source code:

```bash
npx tsx src/cli/index.ts api context-full \
  -r https://github.com/Chewy-Inc/avs-service \
  -t avs
```

## Configuration (`config.json`)

```json
{
  "baseUrl": "https://avs.scff.stg.chewy.com",
  "environment": "stg",
  "useOAuth": false,
  "defaultHeaders": { "Content-Type": "application/json" }
}
```

## Response Codes

| Code | Description | validatedAddress | requestAddressSanitized |
|------|-------------|------------------|------------------------|
| VERIFIED | Valid, complete address | ✅ populated | null |
| CORRECTED | Valid, fields corrected | ✅ populated | null |
| NOT_VERIFIED | Invalid address | null | ✅ populated |
| STREET_PARTIAL | Street name only | null | ✅ populated |
| PREMISES_PARTIAL | Partial match | ✅ populated | null |

## Generating Tests

```bash
# Generate and run tests from NLP
npx tsx src/cli/index.ts api test -t avs \
  -i "Verify valid address returns VERIFIED"

# Generate only (don't run)
npx tsx src/cli/index.ts api test -t avs \
  -i "Test fake address returns NOT_VERIFIED" \
  --no-run
```

## Running Tests

```bash
# Run all AVS tests
npm run test:api

# Run specific feature
npx cucumber-js features/api/avs/verification/*.feature \
  --import 'src/steps/api/common/common.steps.ts' \
  --import 'src/steps/api/avs/*.steps.ts'
```
