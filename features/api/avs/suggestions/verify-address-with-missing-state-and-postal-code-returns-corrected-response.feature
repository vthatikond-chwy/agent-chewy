Feature: Address Validation for Missing State and Postal Code

  @addressValidation @suggestions
  Scenario: Verify address with missing state and postal code returns corrected response
    Given the API endpoint for verify-address-with-missing-state-and-postal-code-returns-corrected-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-missing-state-and-postal-code-returns-corrected-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire |  |  | US |
    When I send a POST request for verify-address-with-missing-state-and-postal-code-returns-corrected-response
    Then the response status for verify-address-with-missing-state-and-postal-code-returns-corrected-response should be 200
    And the response code for verify-address-with-missing-state-and-postal-code-returns-corrected-response should be "CORRECTED"
    And the cityChanged field for verify-address-with-missing-state-and-postal-code-returns-corrected-response should be true or false
    And the postalChanged field for verify-address-with-missing-state-and-postal-code-returns-corrected-response should be true
    And the stateProvinceChanged field for verify-address-with-missing-state-and-postal-code-returns-corrected-response should be true
    And the validatedAddress should be populated for verify-address-with-missing-state-and-postal-code-returns-corrected-response
    And the requestAddressSanitized should be null for verify-address-with-missing-state-and-postal-code-returns-corrected-response
    And the response matches the expected schema