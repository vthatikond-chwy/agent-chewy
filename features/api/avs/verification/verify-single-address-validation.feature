Feature: Verify Single Address Validation

  @api @verifyAddress
  Scenario: Verify Single Address Validation
    Given the API endpoint for verify-single-address-validation test is "/avs/v1.0/verifyAddress"
    And the request body for verify-single-address-validation is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-single-address-validation
    Then the response status for verify-single-address-validation should be 200
    And the response code for verify-single-address-validation should be "VERIFIED"
    And the validatedAddress for verify-single-address-validation should match requestAddress