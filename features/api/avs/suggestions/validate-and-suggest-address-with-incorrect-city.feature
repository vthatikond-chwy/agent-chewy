Feature: Validate and suggest address with incorrect city

  @addressValidation @suggestion
  Scenario: Validate and suggest address with incorrect city
    Given the API endpoint for validate-and-suggest-address-with-incorrect-city test is "/avs/v1.0/verifyAddress"
    And the request body for validate-and-suggest-address-with-incorrect-city is:
      | streets       | city  | stateOrProvince | country |
      | 600 HARLAN CT | Bonair | GA              | US      |
    When I send a POST request for validate-and-suggest-address-with-incorrect-city
    Then the response status for validate-and-suggest-address-with-incorrect-city should be 200
    And the response code for validate-and-suggest-address-with-incorrect-city should be "CORRECTED"
    And the cityChanged field for validate-and-suggest-address-with-incorrect-city should be true
    And the validatedAddress should be populated for validate-and-suggest-address-with-incorrect-city
    And the requestAddressSanitized should be null for validate-and-suggest-address-with-incorrect-city
    And the response matches the expected schema