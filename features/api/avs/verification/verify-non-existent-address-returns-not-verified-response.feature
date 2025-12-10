Feature: Verify non-existent address handling in Address Validation Service

  @addressVerification @negative
  Scenario: Verify non-existent address returns NOT_VERIFIED response
    Given the API endpoint for verify-non-existent-address-returns-not-verified-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-non-existent-address-returns-not-verified-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 99999 NONEXISTENT BLVD | Faketown | ZZ | 99999 | US |
    When I send a POST request for verify-non-existent-address-returns-not-verified-response
    Then the response status for verify-non-existent-address-returns-not-verified-response should be 200
    And the response code for verify-non-existent-address-returns-not-verified-response should be "NOT_VERIFIED"
    And the validatedAddress should be null for verify-non-existent-address-returns-not-verified-response
    And the requestAddressSanitized should be populated for verify-non-existent-address-returns-not-verified-response
    And the response matches the expected schema