Feature: Verify address with wrong street number expecting STREET_PARTIAL response

  @addressVerification @STREET_PARTIAL
  Scenario: Verify address with wrong street number expecting STREET_PARTIAL response
    Given the API endpoint for verify-address-with-wrong-street-number-expecting-street-partial-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-wrong-street-number-expecting-street-partial-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 999 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-wrong-street-number-expecting-street-partial-response
    Then the response status for verify-address-with-wrong-street-number-expecting-street-partial-response should be 200
    And the response code for verify-address-with-wrong-street-number-expecting-street-partial-response should be "STREET_PARTIAL"
    And the validatedAddress should be null for verify-address-with-wrong-street-number-expecting-street-partial-response
    And the requestAddressSanitized should be populated for verify-address-with-wrong-street-number-expecting-street-partial-response
    And the response matches the expected schema