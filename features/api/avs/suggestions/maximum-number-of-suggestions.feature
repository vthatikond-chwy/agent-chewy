Feature: Validate Maximum Number of Suggestions in Address Verification Service

  @avs @boundary
  Scenario: Maximum Number of Suggestions
    Given the API endpoint for maximum-number-of-suggestions test is "/avs/v1.0/suggestAddresses"
    And the request body for maximum-number-of-suggestions test is:
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005      | US      |
    And the maxSuggestions for maximum-number-of-suggestions test is 5
    When I send a POST request for maximum-number-of-suggestions
    Then the response status code should be 200 for maximum-number-of-suggestions test
    And the number of suggestions should not exceed 5 for maximum-number-of-suggestions test