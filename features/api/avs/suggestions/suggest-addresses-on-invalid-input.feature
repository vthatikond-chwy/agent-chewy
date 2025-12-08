Feature: Suggest Addresses on Invalid Input

  @api @suggestAddresses
  Scenario: Suggest Addresses on Invalid Input
    Given the API endpoint for suggest-addresses-on-invalid-input test is "/avs/v1.0/suggestAddresses"
    And the request body for suggest-addresses-on-invalid-input is:
      | streets          | city     | stateOrProvince | country | addressType | engine        | maxSuggestions |
      | 1600 Amphitheatre Pkwy | Mountain View | CA | US | UNKNOWN | AVS_EXPERIAN | 3 |
    When I send a POST request for suggest-addresses-on-invalid-input
    Then the response status for suggest-addresses-on-invalid-input should be 200
    And the response for suggest-addresses-on-invalid-input should contain at least 1 suggestion
    And the responseCode should not be VERIFIED for any suggestion in suggest-addresses-on-invalid-input