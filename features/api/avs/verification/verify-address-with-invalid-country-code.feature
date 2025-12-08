Feature: Verify address validation with invalid country code

  @api @verifyAddress @boundary
  Scenario: Verify address with invalid country code
    Given the API endpoint for verify-address-with-invalid-country-code test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-invalid-country-code is
      | addressType    | RESIDENTIAL        |
      | city           | Orlando            |
      | country        | XX                 |
      | postalCode     | 32801              |
      | stateOrProvince| FL                 |
      | streets        | 400 S Orange Ave   |
    When I send a POST request for verify-address-with-invalid-country-code
    Then the response status for verify-address-with-invalid-country-code should be 200
    And the response code for verify-address-with-invalid-country-code should be "NOT_VERIFIED"