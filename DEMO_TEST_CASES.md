# AVS API Demo Test Cases

## Overview
Three simple test cases demonstrating positive, negative, and edge case scenarios for the Address Validation Service (AVS) API.

---

## Test Case 1: Positive Test ✅

### Description
Verify a valid complete address with all required fields returns VERIFIED response code.

### Natural Language Input
```
"Verify a valid complete address with all required fields returns VERIFIED response code"
```

### Endpoint
`POST /avs/v1.0/verifyAddress`

### Test Data
```json
{
  "streets": ["600 HARLAN CT"],
  "city": "Bonaire",
  "stateOrProvince": "GA",
  "postalCode": "31005-5427",
  "country": "US"
}
```

### Expected Results
- **Status Code**: `200`
- **Response Code**: `"VERIFIED"`
- **Schema Validation**: Pass

### What It Demonstrates
- Happy path testing with complete valid address
- All required fields present and valid
- Successful address validation

---

## Test Case 2: Negative Test ❌

### Description
Verify an address with invalid zip code and state code returns NOT_VERIFIED response code.

### Natural Language Input
```
"Verify an address with invalid zip code and state code returns NOT_VERIFIED response code"
```

### Endpoint
`POST /avs/v1.0/verifyAddress`

### Test Data
```json
{
  "streets": ["123 Invalid St"],
  "city": "Nowhere",
  "stateOrProvince": "XX",
  "postalCode": "00000",
  "country": "US"
}
```

### Expected Results
- **Status Code**: `200`
- **Response Code**: `"NOT_VERIFIED"`
- **Schema Validation**: Pass

### What It Demonstrates
- Negative testing with invalid address data
- Invalid zip code (`00000`) and invalid state code (`XX`)
- API correctly identifies invalid addresses

---

## Test Case 3: Edge Case 🔍

### Description
Get address suggestions for a partial address missing postal code returns multiple suggestions.

### Natural Language Input
```
"Get address suggestions for a partial address missing postal code returns multiple suggestions"
```

### Endpoint
`POST /avs/v1.0/suggestAddresses`

### Test Data
```json
{
  "streets": ["1600 Amphitheatre Pkwy"],
  "city": "Mountain View",
  "stateOrProvince": "CA",
  "country": "US"
}
```
*Note: `postalCode` is omitted (optional field)*

### Expected Results
- **Status Code**: `200`
- **Response**: Array of address suggestions
- **Schema Validation**: Pass
- **Number of Suggestions**: Greater than 1

### What It Demonstrates
- Edge case testing with partial/incomplete address
- Optional field handling (postal code not required for suggestions)
- API provides multiple address suggestions when input is partial

---

## Summary Table

| Test Type | Endpoint | Key Feature | Expected Result |
|-----------|----------|-------------|-----------------|
| **Positive** | `/avs/v1.0/verifyAddress` | Complete valid address | `VERIFIED` |
| **Negative** | `/avs/v1.0/verifyAddress` | Invalid address data | `NOT_VERIFIED` |
| **Edge Case** | `/avs/v1.0/suggestAddresses` | Partial address (missing optional field) | Multiple suggestions |

---

## Demo Flow

1. **Start with Positive Test** (2 min)
   - Show valid address validation
   - Demonstrate successful verification

2. **Show Negative Test** (2 min)
   - Show invalid address handling
   - Demonstrate error detection

3. **End with Edge Case** (2 min)
   - Show partial address suggestions
   - Demonstrate optional field handling

**Total Demo Time**: ~6 minutes

---

## Notes for Demo

- All test data comes from `swagger/teams/avs/rules.json`
- These are working test cases that have been validated
- Each test includes automatic schema validation
- Tests are generated from natural language input using AI

