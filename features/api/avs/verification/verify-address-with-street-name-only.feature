Feature: Verify Address with Street Name Only

  @addressVerification @streetNameOnly
  Scenario: Verify Address with Street Name Only
    Given the API endpoint for verify-address-with-street-name-only test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-street-name-only is:
      | streets | city | stateOrProvince | postalCode | country |
      | HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-street-name-only
    Then the response status for verify-address-with-street-name-only should be 200
    And the response code for verify-address-with-street-name-only should be "STREET_PARTIAL"
    And the validatedAddress should be null for verify-address-with-street-name-only
    And the response matches the expected schema