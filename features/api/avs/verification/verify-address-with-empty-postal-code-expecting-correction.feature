Feature: Verify address correction for empty postal code

  @addressValidation @postalCodeCorrection
  Scenario: Verify address with empty postal code expecting correction
    Given the API endpoint for verify-address-with-empty-postal-code-expecting-correction test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-empty-postal-code-expecting-correction is:
      | streets | city | stateOrProvince | postalCode | country |
      | 1600 Amphitheatre Parkway | Mountain View | CA |  | US |
    When I send a POST request for verify-address-with-empty-postal-code-expecting-correction
    Then the HTTP response status for verify-address-with-empty-postal-code-expecting-correction should be 200
    And the response code for verify-address-with-empty-postal-code-expecting-correction should be "CORRECTED"
    And the postalChanged field for verify-address-with-empty-postal-code-expecting-correction should be true
    And the validatedAddress should be populated for verify-address-with-empty-postal-code-expecting-correction
    And the requestAddressSanitized should be null for verify-address-with-empty-postal-code-expecting-correction
    And the response matches the expected schema