Feature: Verify Address with Empty Postal Code Expecting Corrected Response

  @addressVerification @postalCodeCorrection
  Scenario: Verify address with empty postal code expecting corrected response
    Given the API endpoint for verify-address-with-empty-postal-code-expecting-corrected-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-empty-postal-code-expecting-corrected-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA |  | US |
    When I send a POST request for verify-address-with-empty-postal-code-expecting-corrected-response
    Then the response status for verify-address-with-empty-postal-code-expecting-corrected-response should be 200
    And the response code for verify-address-with-empty-postal-code-expecting-corrected-response should be "CORRECTED"
    And the postalChanged field for verify-address-with-empty-postal-code-expecting-corrected-response should be true
    And the validatedAddress should be populated for verify-address-with-empty-postal-code-expecting-corrected-response
    And the requestAddressSanitized should be null for verify-address-with-empty-postal-code-expecting-corrected-response
    And the response matches the expected schema