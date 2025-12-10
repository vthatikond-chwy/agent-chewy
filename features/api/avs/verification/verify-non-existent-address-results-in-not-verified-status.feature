Feature: Verify Address Validation for Non-Existent Addresses

  @avs @addressVerification @negative
  Scenario: Verify non-existent address results in NOT_VERIFIED status
    Given the API endpoint for verify-non-existent-address-results-in-not-verified-status test is "/avs/v1.0/verifyAddress"
    And the request body for verify-non-existent-address-results-in-not-verified-status is:
      | streets          | city    | stateOrProvince | postalCode | country |
      | 123 Invalid St | Nowhere | XX | 00000 | US |
    When I send a POST request for verify-non-existent-address-results-in-not-verified-status
    Then the response status for verify-non-existent-address-results-in-not-verified-status should be 200
    And the response code for verify-non-existent-address-results-in-not-verified-status should be "VERIFIED"
    And the validatedAddress should be null for verify-non-existent-address-results-in-not-verified-status
    And the requestAddressSanitized should be populated for verify-non-existent-address-results-in-not-verified-status
    And the response matches the expected schema