Feature: Verify Address with Postal Code and +4 Extension

  @addressVerification @postalCodeExtension
  Scenario: Verify Address with Postal Code and +4 Extension
    Given the API endpoint for verify-address-with-postal-code-and-4-extension test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-postal-code-and-4-extension is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-postal-code-and-4-extension
    Then the response status for verify-address-with-postal-code-and-4-extension should be 200
    And the response code for verify-address-with-postal-code-and-4-extension should be "VERIFIED"
    And the response matches the expected schema
    And the response[0].postalChanged should be true for verify-address-with-postal-code-and-4-extension