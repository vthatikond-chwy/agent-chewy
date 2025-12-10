Feature: Verify fake address with AVS and expect NOT_VERIFIED status

  @avs @addressVerification @negative @api
  Scenario: Verify fake address and expect NOT_VERIFIED status
    Given the API endpoint for verify-fake-address-and-expect-not-verified-status test is "/avs/v1.0/verifyAddress"
    And the request body for verify-fake-address-and-expect-not-verified-status is:
      | streets | city | stateOrProvince | postalCode | country |
      | 99999 FAKE BLVD | Nowhere | ZZ | 99999 | US |
    When I send a POST request for verify-fake-address-and-expect-not-verified-status
    Then the response status for verify-fake-address-and-expect-not-verified-status should be 200
    And the response code for verify-fake-address-and-expect-not-verified-status should be "NOT_VERIFIED"
    And the validatedAddress should be null for verify-fake-address-and-expect-not-verified-status
    And the requestAddressSanitized should be populated for verify-fake-address-and-expect-not-verified-status
    And the response matches the expected schema