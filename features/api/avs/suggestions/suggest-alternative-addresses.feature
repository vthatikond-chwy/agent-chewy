Feature: Suggest Alternative Addresses

  @addressSuggestion @alternative @api @positive
  Scenario: Suggest Alternative Addresses
    Given the API endpoint for suggest-alternative-addresses test is "/avs/v1.0/suggestAddresses"
    And the request body for suggest-alternative-addresses is:
      | streets               | city          | stateOrProvince | country |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | US |
    When I send a POST request for suggest-alternative-addresses
    Then the response status for suggest-alternative-addresses should be 200
    And at least one suggestion should be returned for suggest-alternative-addresses
    And suggestions should be ordered by recommendation for suggest-alternative-addresses