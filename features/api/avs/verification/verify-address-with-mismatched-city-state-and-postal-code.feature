Feature: Verify Address with Mismatched City, State, and Postal Code

  @addressVerification @negative
  Scenario: Verify Address with Mismatched City, State, and Postal Code
    Given the API endpoint for verify-address-with-mismatched-city-state-and-postal-code test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-mismatched-city-state-and-postal-code is:
      | streets | city | stateOrProvince | postalCode | country |
      | 123 XYZ STREET | Snoqualmie | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-mismatched-city-state-and-postal-code
    Then the response status for verify-address-with-mismatched-city-state-and-postal-code should be 200
    And the response code for verify-address-with-mismatched-city-state-and-postal-code should be "NOT_VERIFIED"
    And the validatedAddress should be null for verify-address-with-mismatched-city-state-and-postal-code
    And the requestAddressSanitized should be populated for verify-address-with-mismatched-city-state-and-postal-code
    And the response matches the expected schema