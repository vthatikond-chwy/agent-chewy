# AVS Team Rules and Configuration

This directory contains team-specific configuration and rules for the AVS (Address Validation Service) API test generation.

## Files

- `avs-api.json` - Swagger/OpenAPI specification for AVS API
- `config.json` - Team configuration (base URL, OAuth settings, headers)
- `rules.json` - Team-specific rules for test generation

## Configuration (`config.json`)

```json
{
  "baseUrl": "https://avs.scff.stg.chewy.com",
  "environment": "stg",
  "useOAuth": false,
  "defaultHeaders": {
    "Content-Type": "application/json"
  },
  "timeout": 30000
}
```

**Key Settings:**
- `useOAuth: false` - AVS API does NOT require OAuth authentication
- Base URL points to staging environment
- Only Content-Type header is needed

## Rules (`rules.json`)

### Response Patterns

**Array Response Endpoints:**
- `/avs/v1.0/suggestAddresses` - Returns an array directly
  - Use: `response.data` (it's already an array)
  - DO NOT use: `response.data.suggestions` or `response.data.items`

**Object Response Endpoints:**
- `/avs/v1.0/verifyAddress` - Returns an object with properties
- `/avs/v1.0/verifyBulkAddress` - Returns an array of objects

### Normalization Rules

1. **Address Comparison: Case-Insensitive**
   - API may return addresses in uppercase
   - Always use `.toUpperCase()` for both expected and actual values
   - Example: `expect(actual.toUpperCase()).to.equal(expected.toUpperCase())`

2. **Postal Code Handling: Prefix Match**
   - API may return ZIP+4 format (e.g., "94043-1351")
   - Check if response postal code includes/contains the request postal code
   - Example: `expect(responsePostalCode).to.include(requestPostalCode)`

3. **Street Name Handling: Abbreviation Tolerant**
   - API may normalize street names (e.g., "Parkway" → "PKWY")
   - Be flexible in comparisons - check if street contains key parts
   - Example: Check that street number matches, not exact street name

### Query Parameters

**`/avs/v1.0/suggestAddresses`:**
- `maxSuggestions` (optional) - Maximum number of suggestions to return
- `percentMatch` (optional) - Minimum confidence level (default: 85)
- `engine` (optional) - Validation engine to use

**`/avs/v1.0/verifyAddress`:**
- `engine` (optional) - Validation engine to use

### Assertion Patterns

1. **Response Code Property: `responseCode`**
   - Use `response.data.responseCode` (NOT `status` or `verificationStatus`)
   - Valid values: `VERIFIED`, `PREMISES_PARTIAL`, `STREET_PARTIAL`, `NOT_VERIFIED`, `CORRECTED`

2. **Address Validation:**
   - Use `validatedAddress` field when response code is VERIFIED or CORRECTED
   - Use `requestAddress` field to compare with input
   - Compare fields: `city`, `stateOrProvince`, `country`, `postalCode`

## Common Issues and Solutions

### Query Parameters Issue
**Problem**: Adding `params: { engine: 'default' }` to axios requests causes 400 error: "No engine found that matches: default"

**Solution**: 
- DO NOT include optional query parameters unless explicitly needed in the test scenario
- The API works correctly without query parameters
- Only add query parameters if the test scenario specifically requires them

**Example**:
```typescript
// ❌ WRONG - causes 400 error
axios.post(url, body, { headers, params: { engine: 'default' } });

// ✅ CORRECT - works without params
axios.post(url, body, { headers });
```

## Common Issues and Solutions (continued)

### Issue: Generated code includes OAuth token
**Solution:** Check `config.json` - `useOAuth` should be `false` for AVS

### Issue: suggestAddresses returns array but test expects object
**Solution:** Check `rules.json` - endpoint is listed in `arrayResponseEndpoints`

### Issue: Address comparison fails due to case differences
**Solution:** Use case-insensitive comparison as per normalization rules

### Issue: Postal code comparison fails (ZIP+4)
**Solution:** Use prefix match - check if response includes request postal code

## Example Generated Code Patterns

### Correct Headers (No OAuth):
```typescript
this.headers = {
  'Content-Type': 'application/json'
  // NO Authorization header for AVS
};
```

### Correct Array Response Handling:
```typescript
// For suggestAddresses endpoint
expect(this.response?.data).to.be.an('array').that.is.not.empty;
const firstSuggestion = this.response?.data[0];
```

### Correct Response Code Check:
```typescript
expect(responseBody).to.have.property('responseCode');
expect(responseBody.responseCode).to.equal('VERIFIED');
```

### Correct Address Comparison:
```typescript
// Case-insensitive
expect(responseBody.validatedAddress.city.toUpperCase())
  .to.equal(requestAddress.city.toUpperCase());

// Postal code prefix match
expect(responseBody.validatedAddress.postalCode)
  .to.include(requestAddress.postalCode);
```

## Updating Rules

When you discover new patterns or issues:

1. Update `rules.json` with the new pattern
2. Document the issue and solution in this README
3. Regenerate tests to verify the fix

## Testing

Run AVS tests:
```bash
npm run test:avs
```

Or run specific test:
```bash
npx cucumber-js features/api/avs/**/*.feature --import 'src/steps/api/common/common.steps.ts' --import 'src/steps/api/avs/**/*.steps.ts'
```

