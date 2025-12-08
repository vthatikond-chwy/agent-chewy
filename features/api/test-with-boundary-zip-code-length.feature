Feature: Test API with boundary ZIP code length

  @api @boundary
  Scenario: Verify API handles US ZIP codes with maximum length including '+4' extension
    Given the API endpoint for test-with-boundary-zip-code-length test is "/avs/v1.0/suggestAddresses"
    And the request body for test-with-boundary-zip-code-length includes the following address details
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005-1234 | US      |
    When I send a POST request for test-with-boundary-zip-code-length
    Then the response status code should be 200 for test-with-boundary-zip-code-length
    And the response for test-with-boundary-zip-code-length should contain "VERIFIED" as responseCode