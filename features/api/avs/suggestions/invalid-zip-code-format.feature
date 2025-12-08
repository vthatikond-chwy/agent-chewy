Feature: Validate ZIP Code Format in Address Verification Service

  @avs @zipValidation @negative
  Scenario: Invalid ZIP Code Format
    Given the API endpoint for invalid-zip-code-format test is "/avs/v1.0/suggestAddresses"
    And the request body for invalid-zip-code-format test is:
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 310055     | US      |
    When I send a POST request for invalid-zip-code-format
    Then the response status code should be 200 for invalid-zip-code-format test
    And the response for invalid-zip-code-format test should indicate the postal code was not verified or corrected
    And the postalChanged flag should be true for invalid-zip-code-format test