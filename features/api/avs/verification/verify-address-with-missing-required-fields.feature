Feature: Verify Address API with Missing Required Fields

  @api @verifyAddress @negative
  Scenario: Verify address with missing required fields
    Given the API endpoint for verify-address-with-missing-required-fields test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-missing-required-fields test is missing required fields
      | city    | country |
      | Orlando | US      |
    When I send a POST request for verify-address-with-missing-required-fields to the verifyAddress endpoint
    Then the response status code should be 400 for verify-address-with-missing-required-fields test
    And the response body should include an error message "missing required fields" for verify-address-with-missing-required-fields test