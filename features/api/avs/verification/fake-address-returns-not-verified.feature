Feature: Fake Address Returns Not_verified

  @api @verifyAddress @negative @not_verified
  Scenario: Fake Address Returns Not_verified
    Given the API endpoint for fake-address-returns-not-verified test is "/avs/v1.0/verifyAddress"
    And the request body for fake-address-returns-not-verified is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 123 fake address | fake city | ND |  | US |
    When I send a POST request for fake-address-returns-not-verified to the address verification service
    Then the HTTP response status for fake-address-returns-not-verified should be 200
    And the response code for fake-address-returns-not-verified should be "NOT_VERIFIED"
    And the validatedAddress should be null for fake-address-returns-not-verified

    And the response matches the expected schema