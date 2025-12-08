Feature: Suggest Addresses with Incomplete Data

  @addressSuggestion @suggestAddresses @api @positive
  Scenario: Suggest addresses with incomplete data
    Given the API endpoint for suggest-addresses-with-incomplete-data test is "/avs/v1.0/suggestAddresses"
    And the request body for suggest-addresses-with-incomplete-data is:
      | streets | city | stateOrProvince | country |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | US |
    When I send a POST request for suggest-addresses-with-incomplete-data
    Then the response code for suggest-addresses-with-incomplete-data should be 200
    And the response body for suggest-addresses-with-incomplete-data is an array
    And the response for suggest-addresses-with-incomplete-data contains address suggestions