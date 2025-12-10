# AVS API Test Scenarios - Complete Reference

This document summarizes all possible test scenarios for the AVS (Address Validation Service) API based on response codes and field changes.

## Response Codes

The AVS API returns one of five response codes:

1. **VERIFIED** - Address is valid and complete
2. **CORRECTED** - Address is valid but some fields were corrected/added
3. **PREMISES_PARTIAL** - Street address is partially verified
4. **STREET_PARTIAL** - Only the street name is verified
5. **NOT_VERIFIED** - Address cannot be verified

## Complete Scenario List

### 1. VERIFIED Scenarios

#### 1.1 Valid Address with Postal Code
- **Input**: Complete valid address with postal code
- **Expected**: `responseCode: "VERIFIED"`, all change indicators `false`, `validatedAddress` populated, `requestAddressSanitized: null`
- **Use Case**: Standard happy path for address validation

### 2. CORRECTED Scenarios

#### 2.1 Valid Address with Empty Postal Code
- **Input**: Valid address but `postalCode: ""`
- **Expected**: `responseCode: "CORRECTED"`, `postalChanged: true`, `validatedAddress.postalCode` populated
- **Use Case**: API adds missing postal code

#### 2.2 Valid Address with Incorrect City
- **Input**: Valid address but city name has typo (e.g., "Bonairee" instead of "Bonaire")
- **Expected**: `responseCode: "CORRECTED"`, `cityChanged: true`, `validatedAddress.city` corrected
- **Use Case**: API corrects city name spelling

#### 2.3 Valid Address with Incorrect State
- **Input**: Valid address but wrong state (e.g., "FL" instead of "GA")
- **Expected**: `responseCode: "CORRECTED"`, `stateProvinceChanged: true`, `validatedAddress.stateOrProvince` corrected
- **Use Case**: API corrects state code

#### 2.4 Valid Address with Incorrect Street
- **Input**: Valid address but street name has variation (e.g., "COURT" instead of "CT")
- **Expected**: `responseCode: "CORRECTED"`, `streetChanged: true`, `validatedAddress.streets` corrected
- **Use Case**: API standardizes street abbreviations

### 3. PREMISES_PARTIAL Scenarios

#### 3.1 Wrong Street Number
- **Input**: Valid street name but wrong number (e.g., "999 HARLAN CT" instead of "600 HARLAN CT")
- **Expected**: `responseCode: "PREMISES_PARTIAL"`, `streetChanged: true`, `validatedAddress` populated with corrected number
- **Use Case**: Street exists but specific premises doesn't match

### 4. STREET_PARTIAL Scenarios

#### 4.1 Street Name Only (No Number)
- **Input**: Only street name without specific address number (e.g., "HARLAN CT")
- **Expected**: `responseCode: "STREET_PARTIAL"`, `validatedAddress` populated with street-level validation
- **Use Case**: Street name verified but no specific address

### 5. NOT_VERIFIED Scenarios

#### 5.1 Invalid Address - Mismatched City/State/Postal
- **Input**: Address with mismatched components (e.g., city "Snoqualmie" with postal "31005-5427" for GA)
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated
- **Use Case**: Address components don't match geographically

#### 5.2 Non-existent Address
- **Input**: Completely fake address (e.g., "123 FAKE STREET", "Nowhere", "XX", "99999")
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated, `shippableResponseCode: "NOT_SHIPPABLE"`
- **Use Case**: Address doesn't exist

#### 5.3 Missing Required Fields
- **Input**: Address with missing required fields (e.g., empty `stateOrProvince` and `postalCode`)
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated, `shippableResponseCode: "NOT_VALIDATED"`
- **Use Case**: Insufficient information to validate

## Response Structure Patterns

### validatedAddress
- **Populated for**: VERIFIED, CORRECTED, PREMISES_PARTIAL, STREET_PARTIAL
- **Null for**: NOT_VERIFIED
- **Contains**: Corrected/validated address information

### requestAddressSanitized
- **Null for**: VERIFIED, CORRECTED, PREMISES_PARTIAL, STREET_PARTIAL
- **Populated for**: NOT_VERIFIED
- **Contains**: Sanitized version of input address (e.g., standardized street abbreviations)

### Field Change Indicators
- **postalChanged**: `true` when postal code was added or corrected
- **cityChanged**: `true` when city was corrected
- **stateProvinceChanged**: `true` when state/province was corrected
- **streetChanged**: `true` when street address was corrected

## Natural Language Test Generation

You can generate tests for any of these scenarios using natural language:

```typescript
// Example: Generate test for empty postal code scenario
const scenarios = await generator.generateTestScenarios(
  "Test that when we send a valid address with empty postal code, we get a CORRECTED response with postalChanged set to true",
  swaggerSpec,
  undefined,
  swaggerSpecPath
);
```

The generator understands:
- "valid address" → VERIFIED
- "empty postal code" → CORRECTED with postalChanged: true
- "incorrect city" → CORRECTED with cityChanged: true
- "wrong street number" → PREMISES_PARTIAL
- "street name only" → STREET_PARTIAL
- "invalid address" → NOT_VERIFIED
- "mismatched address" → NOT_VERIFIED
- "non-existent address" → NOT_VERIFIED

## Running Test Generation

Use the example script to generate all scenarios:

```bash
npx ts-node examples/generate-all-avs-scenarios.ts
```

This will generate Cucumber feature files for all use cases defined in `use-cases.json`.


