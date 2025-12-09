Feature: Verify address correction functionality

  @verifyAddress @correction @api @positive
  Scenario: Verify address with incorrect city name returns corrected address
    Given the API endpoint for verify-address-with-incorrect-city-name-returns-corrected-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-incorrect-city-name-returns-corrected-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-incorrect-city-name-returns-corrected-address
    Then the response status for verify-address-with-incorrect-city-name-returns-corrected-address should be 200
    And the response code for verify-address-with-incorrect-city-name-returns-corrected-address should be "CORRECTED"
    And the response matches the expected schema
    And the cityChanged for verify-address-with-incorrect-city-name-returns-corrected-address is true
    And the validatedAddress.city for verify-address-with-incorrect-city-name-returns-corrected-address equals "Springfield"