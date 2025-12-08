Feature: Verify handling of addresses from unsupported countries

  @avs @countrySupport @api @negative
  Scenario: Unsupported Country
    Given the API endpoint for unsupported-country test is "/avs/v1.0/suggestAddresses"
    And the request body for unsupported-country test is
      | streets     | city       | stateOrProvince | postalCode | country |
      | 123 Main St | Somewhere  | NA              | 00000      | ZZ      |
    When I send a POST request for unsupported-country to suggest addresses
    Then the response code should be 200 for unsupported-country test
    And the response for unsupported-country should indicate "NOT_VERIFIED"
    And the validated address country in the response should be "US" for unsupported-country test