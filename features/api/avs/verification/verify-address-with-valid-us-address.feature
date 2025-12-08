Feature: Verify Address API Validation

  @api @verifyAddress @positive
  Scenario: Verify address with valid US address
    Given the API endpoint for verify-address-with-valid-us-address test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-valid-us-address is:
      | addressType   | RESIDENTIAL                      |
      | city          | Orlando                          |
      | country       | US                               |
      | postalCode    | 32801                            |
      | stateOrProvince | FL                             |
      | streets       | 400 S Orange Ave                 |
    And the geocode data for verify-address-with-valid-us-address is:
      | latitude  | 28.538336 |
      | longitude | -81.379234|
    When I send a POST request for verify-address-with-valid-us-address
    Then the response status for verify-address-with-valid-us-address should be 200
    And the response for verify-address-with-valid-us-address should have a code of "VERIFIED"
    And the validated address country in the response for verify-address-with-valid-us-address should equal "US"