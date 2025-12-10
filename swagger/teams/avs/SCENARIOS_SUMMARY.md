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

#### 2.4 Valid Address with Missing State and Postal Code
- **Input**: Valid street and city but empty `stateOrProvince` and `postalCode`
- **Expected**: `responseCode: "CORRECTED"`, `stateProvinceChanged: true`, `postalChanged: true`, `validatedAddress` populated with inferred values
- **Use Case**: API can infer state and postal code from valid street + city combination

### 2.5 VERIFIED with Street Abbreviation Change

#### 2.5.1 Street Abbreviation Normalization (COURT → CT)
- **Input**: Valid address but street uses full word (e.g., "600 HARLAN COURT")
- **Expected**: `responseCode: "VERIFIED"`, `streetChanged: true`, `validatedAddress.streets` normalized to "600 HARLAN CT"
- **Use Case**: API normalizes abbreviations but considers address VERIFIED (not CORRECTED) since it's a formatting change only

### 3. STREET_PARTIAL Scenarios

#### 3.1 Wrong Street Number
- **Input**: Valid street name but wrong/non-existent number (e.g., "999 HARLAN CT" instead of "600 HARLAN CT")
- **Expected**: `responseCode: "STREET_PARTIAL"`, `validatedAddress: null`, `requestAddressSanitized` populated
- **Use Case**: Street exists but specific premises number doesn't exist

#### 3.2 Street Name Only (No Number)
- **Input**: Only street name without specific address number (e.g., "HARLAN CT")
- **Expected**: `responseCode: "STREET_PARTIAL"`, `validatedAddress: null`, `requestAddressSanitized` populated
- **Use Case**: Street name exists but no specific premises number provided

### 4. PREMISES_PARTIAL Scenarios

> **Note**: PREMISES_PARTIAL is returned when the API can partially match the premises but not fully verify it. This is less common than STREET_PARTIAL.

### 5. NOT_VERIFIED Scenarios

#### 5.1 Invalid Address - Mismatched City/State/Postal
- **Input**: Address with mismatched components (e.g., city "Snoqualmie" with postal "31005-5427" for GA)
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated
- **Use Case**: Address components don't match geographically

#### 5.2 Non-existent Address
- **Input**: Completely fake address (e.g., "123 FAKE STREET", "Nowhere", "XX", "99999")
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated, `shippableResponseCode: "NOT_SHIPPABLE"`
- **Use Case**: Address doesn't exist

#### 5.3 Insufficient Information
- **Input**: Address with missing critical components that cannot be inferred (e.g., only city name without any street)
- **Expected**: `responseCode: "NOT_VERIFIED"`, `validatedAddress: null`, `requestAddressSanitized` populated
- **Use Case**: Truly insufficient information where API cannot infer missing values

> **Note**: If street + city are valid and only state/postal are missing, API returns CORRECTED (see section 2.4). NOT_VERIFIED is returned only when the API truly cannot determine the address.

## Response Structure Patterns

### validatedAddress
- **Populated for**: VERIFIED, CORRECTED, PREMISES_PARTIAL
- **Null for**: STREET_PARTIAL, NOT_VERIFIED
- **Contains**: Corrected/validated address information when address is fully or partially verified

### requestAddressSanitized
- **Null for**: VERIFIED, CORRECTED, PREMISES_PARTIAL
- **Populated for**: STREET_PARTIAL, NOT_VERIFIED
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
- "incorrect state" → CORRECTED with stateProvinceChanged: true
- "missing state and postal" → CORRECTED (API infers from street+city)
- "COURT abbreviation" → VERIFIED with streetChanged: true
- "wrong street number" → STREET_PARTIAL with validatedAddress: null
- "street name only" → STREET_PARTIAL with validatedAddress: null
- "mismatched address" → NOT_VERIFIED
- "non-existent address" → NOT_VERIFIED

## Running Test Generation

Use the example script to generate all scenarios:

```bash
npx ts-node examples/generate-all-avs-scenarios.ts
```

This will generate Cucumber feature files for all use cases defined in `use-cases.json`.


