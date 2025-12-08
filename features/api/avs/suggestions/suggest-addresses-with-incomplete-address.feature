Feature: Suggest Addresses with Incomplete Address

  @addressSuggestion @positive
  Scenario: Suggest Addresses with Incomplete Address
    Given the API endpoint for suggest-addresses-with-incomplete-address test is "/avs/v1.0/suggestAddresses"
    And the request body for suggest-addresses-with-incomplete-address is:
      | streets | city | stateOrProvince | country |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | US |
    When I send a POST request for suggest-addresses-with-incomplete-address
    Then the response status for suggest-addresses-with-incomplete-address should be 200
    And the response for suggest-addresses-with-incomplete-address should be an array
    And each item in the response array for suggest-addresses-with-incomplete-address should have:
      | streets        | city        | stateOrProvince | postalCode |