Feature: Get multiple address suggestions for incomplete address

  @addressSuggestion @postalCodeMissing @api @positive
  Scenario: Get multiple address suggestions for incomplete address
    Given the API endpoint for get-multiple-address-suggestions-for-incomplete-address test is "/avs/v1.0/suggestAddresses"
    And the request body for get-multiple-address-suggestions-for-incomplete-address is:
      | streets | city | stateOrProvince | country |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | US |
    When I send a POST request for get-multiple-address-suggestions-for-incomplete-address
    Then the response status for get-multiple-address-suggestions-for-incomplete-address should be 200
    And the response should contain multiple address suggestions for get-multiple-address-suggestions-for-incomplete-address
    And each suggestion should include a postal code for get-multiple-address-suggestions-for-incomplete-address
    And the response matches the expected schema