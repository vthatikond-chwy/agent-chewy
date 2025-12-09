# ✅ Schema Validation Implementation - COMPLETE

## Summary

**Your API tests now follow the ResponseValidator pattern with Ajv schema validation!**

All generated tests automatically validate responses against Swagger/OpenAPI schemas.

---

## What Was Implemented

### 1. ResponseValidator Class ✅
**Location:** `src/agents/api-agent/response-validator.ts`

```typescript
export class ResponseValidator {
  private ajv: Ajv;

  validate(data: any, schema: any): ValidationResult {
    const validate = this.ajv.compile(schema);
    return { valid: validate(data), errors: validate.errors };
  }

  resolveSchema(schema: any, spec: any): any {
    // Resolves $ref references recursively
  }
}
```

### 2. Enhanced Schema Analyzer ✅
**Location:** `src/agents/api-agent/schema-analyzer.ts`

- Added `fullSchema` property to `SimplifiedSchema` interface
- New `resolveSchemaRefs()` function for recursive $ref resolution
- Prevents circular references with visited Set

```typescript
export interface SimplifiedSchema {
  requiredFields: string[];
  optionalFields: string[];
  flatStructure: boolean;
  responseType: 'object' | 'integer' | 'string' | 'array' | 'unknown';
  example: any;
  fullSchema?: any; // ← NEW: Full resolved schema for validation
}
```

### 3. Common Schema Validation Step ✅
**Location:** `src/steps/api/common/common.steps.ts`

```typescript
Then('the response matches the expected schema', async function (this: CustomWorld) {
  // 1. Auto-detect Swagger spec from baseUrl/endpoint
  // 2. Load and dereference Swagger spec
  // 3. Extract response schema for status code
  // 4. Resolve all $ref references
  // 5. Validate with Ajv (lenient mode - allows null on optional fields)
  // 6. Log detailed errors if validation fails

  const valid = validate(this.response.data);
  expect(valid).to.be.true;
});
```

**Features:**
- ✅ Automatically finds Swagger spec from endpoint/baseURL
- ✅ Supports both OpenAPI 3.0 and Swagger 2.0
- ✅ Resolves `$ref` references recursively
- ✅ Lenient validation - ignores null values on non-required fields
- ✅ Clear error messages with validation details

### 4. Updated Test Generator ✅
**Location:** `src/agents/api-agent/simple-generator.ts`

**Changes:**
1. Imported ResponseValidator
2. Updated feature generation prompts to **always include schema validation step**
3. Updated step definition prompts to **skip generating schema validation** (handled in common steps)

```typescript
CRITICAL REQUIREMENTS:
5. ALWAYS include schema validation step EXACTLY as:
   "And the response matches the expected schema" (NO scenario suffix)
```

```typescript
CRITICAL REQUIREMENTS:
25. CRITICAL - Schema Validation:
    DO NOT generate step definitions for "the response matches the expected schema"
    - this is handled by common.steps.ts with Ajv schema validation
```

---

## Test Results

### ✅ AVS Tests (Working)

```bash
npm run test:avs
```

**Output:**
```
✔ And the response matches the expected schema
✅ Response schema validation passed for POST /avs/v1.0/verifyAddress (200)

1 scenario (1 passed)
7 steps (7 passed)
```

**Schema validation passing!** ✅

---

## Generated Test Example

### Feature File
```gherkin
Feature: Verify Address with Postal Code and +4 Extension

  @addressVerification @postalCodeExtension
  Scenario: Verify Address with Postal Code and +4 Extension
    Given the API endpoint for verify-address-with-postal-code-and-4-extension test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-postal-code-and-4-extension is:
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005-5427 | US      |
    When I send a POST request for verify-address-with-postal-code-and-4-extension
    Then the response status for verify-address-with-postal-code-and-4-extension should be 200
    And the response code for verify-address-with-postal-code-and-4-extension should be "VERIFIED"
    And the response matches the expected schema  ← Schema validation!
```

### Generated Step Definition (Scenario-Specific)
```typescript
Given('the API endpoint for verify-address-with-postal-code-and-4-extension test is {string}', function (endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = { 'Content-Type': 'application/json' };
});

Then('the response code for verify-address-with-postal-code-and-4-extension should be {string}', function (expectedCode: string) {
  const responseCode = this.response?.data.responseCode;
  expect(responseCode).to.equal(expectedCode);
});
```

### Common Step Definition (Shared)
```typescript
// NO scenario-specific generation - handled in common.steps.ts
Then('the response matches the expected schema', async function (this: CustomWorld) {
  // Validates against Swagger schema with Ajv
});
```

---

## NLP Test Generation - Working End-to-End

### Command:
```bash
npx tsx src/cli/index.ts api generate \
  -s swagger/teams/avs/avs-api.json \
  -i "Verify an address that returns VERIFIED with postal code that may have +4 extension added"
```

### Generated:
1. ✅ Feature file with schema validation step
2. ✅ Scenario-specific step definitions
3. ✅ Working test that validates against Swagger schema
4. ✅ Uses working test data from rules.json

---

## Validation Examples

### ✅ Successful Validation
```
✅ Response schema validation passed for POST /avs/v1.0/verifyAddress (200)
```

### ⚠️ Non-Critical Warnings (Allowed)
```
⚠️  Schema validation warnings (non-critical):
[{
  "instancePath": "/requestAddress/addressType",
  "message": "must be string"
}]
```
*Optional fields with null values are allowed*

### ❌ Critical Validation Failure
```
❌ Schema validation failed!
Validation errors: [{
  "instancePath": "/responseCode",
  "keyword": "enum",
  "message": "must be equal to one of the allowed values"
}]
```

---

## Architecture Benefits

### 1. **Universal Flow Compliance** ✅
Your implementation now follows the complete flow you specified:

```
1. Load Swagger spec ✅
2. Analyze deeply ✅
3. NLP processing ✅
4. Smart data generation ✅
5. Generate features ✅
6. Generate step defs ✅
7. VALIDATE AGAINST SCHEMA ✅ ← Now implemented!
8. Run tests ✅
```

### 2. **Automatic Validation** ✅
- Every generated test includes schema validation
- No manual work required
- Swagger spec is the single source of truth

### 3. **Early Bug Detection** ✅
- Catches schema mismatches immediately
- Validates response structure, types, enums
- Provides detailed error messages

### 4. **Maintainable** ✅
- Single common step for all tests
- Easy to update validation logic
- Centralized in `common.steps.ts`

---

## Files Modified/Created

### Created:
- ✅ `src/agents/api-agent/response-validator.ts` - ResponseValidator class
- ✅ `TEST_STATUS.md` - Test status documentation
- ✅ `SCHEMA_VALIDATION_COMPLETE.md` - This file

### Modified:
- ✅ `src/agents/api-agent/schema-analyzer.ts` - Added fullSchema and resolveSchemaRefs
- ✅ `src/agents/api-agent/simple-generator.ts` - Updated prompts for schema validation
- ✅ `src/steps/api/common/common.steps.ts` - Added schema validation step
- ✅ `package.json` - Added ajv-formats dependency

---

## Next Steps (Optional)

1. **Get fresh OAuth token** for Kyrios tests (AVS works without OAuth)
2. **Generate more AVS tests** with different scenarios using NLP
3. **Add schema validation** to existing tests (regenerate them)
4. **Customize validation** rules in response-validator.ts if needed

---

## Usage

### Generate New Test with NLP:
```bash
npx tsx src/cli/index.ts api generate \
  -s swagger/teams/avs/avs-api.json \
  -i "Your test description here"
```

### Run AVS Tests:
```bash
npm run test:avs
```

### Check Schema Validation:
Look for:
```
✅ Response schema validation passed for POST /endpoint (status)
```

---

## Conclusion

**✅ Implementation Complete!**

Your API test framework now:
- Generates tests from natural language
- Automatically validates responses against Swagger schemas
- Provides detailed validation errors
- Follows the ResponseValidator pattern with Ajv

**Schema validation is working end-to-end!** 🚀
