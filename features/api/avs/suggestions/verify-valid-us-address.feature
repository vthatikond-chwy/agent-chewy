Feature: Verify Valid US Address Processing

  @avs @addressValidation @api @positive
  Scenario: Verify Valid US Address
    Given the API endpoint for verify-valid-us-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-us-address test is
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005-5427 | US      |
    When I send a POST request for verify-valid-us-address
    Then the response status code should be 200 for verify-valid-us-address test
    And the response for verify-valid-us-address test should indicate the address is "VERIFIED"
    And the validatedAddress in the response matches the request data for verify-valid-us-address test