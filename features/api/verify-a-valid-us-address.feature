Feature: Verify US Address Validation

  @api @addressValidation @positive
  Scenario: Verify a valid US address
    Given the API endpoint for verify-a-valid-us-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-a-valid-us-address test is
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005-5427 | US      |
    When I send a POST request for verify-a-valid-us-address
    Then the response status code should be 200 for verify-a-valid-us-address test
    And the response for verify-a-valid-us-address test contains 'VERIFIED' as responseCode