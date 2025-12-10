Feature: Address Verification for Mismatched Addresses

  @addressVerification @negative
  Scenario: Verify mismatched address returns NOT_VERIFIED
    Given the API endpoint for verify-mismatched-address-returns-not-verified test is "/avs/v1.0/verifyAddress"
    And the request body for verify-mismatched-address-returns-not-verified is:
      | streets | city | stateOrProvince | postalCode | country |
      | 123 XYZ ST | Wrong City | XX | 0 | US |
    When I send a POST request for verify-mismatched-address-returns-not-verified
    Then the response status for verify-mismatched-address-returns-not-verified should be 200
    And the response code for verify-mismatched-address-returns-not-verified should be "NOT_VERIFIED"
    And the validatedAddress should be null for verify-mismatched-address-returns-not-verified
    And the requestAddressSanitized should be populated for verify-mismatched-address-returns-not-verified
    And the response matches the expected schema