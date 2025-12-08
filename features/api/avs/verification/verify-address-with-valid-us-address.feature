Feature: Verify Address with Valid US Address

  @addressVerification @positive
  Scenario: Verify Address with Valid US Address
    Given the API endpoint for verify-address-with-valid-us-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-valid-us-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-valid-us-address
    Then the response status for verify-address-with-valid-us-address should be 200
    And the response code for verify-address-with-valid-us-address should be "VERIFIED"