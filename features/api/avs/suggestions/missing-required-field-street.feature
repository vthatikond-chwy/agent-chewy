Feature: Validate Address API Error Handling for Missing Required Fields

  @avs @errorHandling @negative
  Scenario: Missing Required Field - Street
    Given the API endpoint for missing-required-field-street test is "/avs/v1.0/suggestAddresses"
    And the request body for missing-required-field-street test without "streets" field is
      | city    | stateOrProvince | postalCode  | country |
      | Bonaire | GA              | 31005-5427 | US      |
    When I send a POST request for missing-required-field-street
    Then the response status code should be 400 for missing-required-field-street test
    And the response for missing-required-field-street test should contain an error message "streets is required"