Feature: Verify Address Validity

  @addressVerification @positive @api
  Scenario: Verify Valid Address
    Given the API endpoint for verify-valid-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-valid-address
    Then the response status for verify-valid-address should be 200
    And the response code for verify-valid-address should be "VERIFIED"
    And the validatedAddress for verify-valid-address should match requestAddress