Feature: Verify Address Validation Service

  @addressVerification @positive
  Scenario: Verify valid address returns VERIFIED
    Given the API endpoint for verify-valid-address-returns-verified test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-address-returns-verified is:
      | streets | city | stateOrProvince | postalCode | country |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | 94043 | US |
    When I send a POST request for verify-valid-address-returns-verified
    Then the HTTP response code should be 200 for verify-valid-address-returns-verified
    And the response code for verify-valid-address-returns-verified should be "VERIFIED"
    And the validatedAddress should be populated for verify-valid-address-returns-verified
    And the requestAddressSanitized should be null for verify-valid-address-returns-verified
    And the response matches the expected schema