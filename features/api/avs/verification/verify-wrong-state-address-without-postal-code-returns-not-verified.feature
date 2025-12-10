Feature: Verify Address Validation Service for Incorrect State Without Postal Code

  @avs @not_verified
  Scenario: Verify wrong state address without postal code returns NOT_VERIFIED
    Given the API endpoint for verify-wrong-state-address-without-postal-code-returns-not-verified test is "/avs/v1.0/verifyAddress"
    And the request body for verify-wrong-state-address-without-postal-code-returns-not-verified is:
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington | ND |  | US |
    When I send a POST request for verify-wrong-state-address-without-postal-code-returns-not-verified
    Then the HTTP response status for verify-wrong-state-address-without-postal-code-returns-not-verified should be 200
    And the response code for verify-wrong-state-address-without-postal-code-returns-not-verified should be "NOT_VERIFIED"
    And the validatedAddress should be null for verify-wrong-state-address-without-postal-code-returns-not-verified
    And the requestAddressSanitized should be populated for verify-wrong-state-address-without-postal-code-returns-not-verified
    And the response matches the expected schema