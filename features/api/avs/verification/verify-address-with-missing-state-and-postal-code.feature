Feature: Verify Address with Missing State and Postal Code Correction

  @addressVerification @correction
  Scenario: Verify Address with Missing State and Postal Code
    Given the API endpoint for verify-address-with-missing-state-and-postal-code test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-missing-state-and-postal-code is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire |  |  | US |
    When I send a POST request for verify-address-with-missing-state-and-postal-code
    Then the response status for verify-address-with-missing-state-and-postal-code should be 200
    And the response code for verify-address-with-missing-state-and-postal-code should be "CORRECTED"
    And the postalChanged field for verify-address-with-missing-state-and-postal-code should be true
    And the cityChanged field for verify-address-with-missing-state-and-postal-code should be true or false
    And the stateProvinceChanged field for verify-address-with-missing-state-and-postal-code should be true
    And the validatedAddress should be populated for verify-address-with-missing-state-and-postal-code
    And the requestAddressSanitized should be null for verify-address-with-missing-state-and-postal-code
    And the response matches the expected schema