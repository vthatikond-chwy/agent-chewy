Feature: Verify valid zipcode through AVS API

  @zipcode @verification @api @positive
  Scenario: Verify valid zipcode
    Given the API endpoint for verify-valid-zipcode test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-zipcode is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-valid-zipcode
    Then the response status for verify-valid-zipcode should be 200
    And the response code for verify-valid-zipcode should be "VERIFIED"
    And the response[0].postalChanged should be false for verify-valid-zipcode