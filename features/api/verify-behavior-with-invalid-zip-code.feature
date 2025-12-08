Feature: Verify API behavior with invalid ZIP code for US address

  @api @addressValidation @negative
  Scenario: Verify behavior with invalid ZIP code
    Given the API endpoint for verify-behavior-with-invalid-zip-code test is "/avs/v1.0/suggestAddresses"
    And the request body for verify-behavior-with-invalid-zip-code includes the following address details
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 12345      | US      |
    When I send a POST request for verify-behavior-with-invalid-zip-code
    Then the response status code should be 200 for verify-behavior-with-invalid-zip-code
    And the response for verify-behavior-with-invalid-zip-code should contain "NOT_VERIFIED" as responseCode