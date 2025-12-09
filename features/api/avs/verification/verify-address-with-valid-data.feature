Feature: Verify Address Validation with AVS API

  @avs @addressVerification @api @positive
  Scenario: Verify Address with Valid Data
    Given the API endpoint for verify-address-with-valid-data test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-valid-data is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-valid-data
    Then the response status for verify-address-with-valid-data should be 200
    And the response code for verify-address-with-valid-data should be "VERIFIED"
    And the validatedAddress matches requestAddress for verify-address-with-valid-data