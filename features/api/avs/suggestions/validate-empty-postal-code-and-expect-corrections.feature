Feature: Address Validation Service Correction Suggestions

  @addressValidation @correctionSuggestion
  Scenario: Validate empty postal code and expect corrections
    Given the API endpoint for validate-empty-postal-code-and-expect-corrections test is "/avs/v1.0/verifyAddress"
    And the request body for validate-empty-postal-code-and-expect-corrections is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA |  | US |
    When I send a POST request for validate-empty-postal-code-and-expect-corrections
    Then the response status for validate-empty-postal-code-and-expect-corrections should be 200
    And the response code for validate-empty-postal-code-and-expect-corrections should be "CORRECTED"
    And the postalChanged field for validate-empty-postal-code-and-expect-corrections should be true
    And the validatedAddress should be populated for validate-empty-postal-code-and-expect-corrections
    And the requestAddressSanitized should be null for validate-empty-postal-code-and-expect-corrections
    And the response matches the expected schema