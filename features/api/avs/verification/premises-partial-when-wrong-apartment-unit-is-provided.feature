Feature: Premises Partial When Wrong Apartment Unit Is Provided

  @api @verifyAddress @boundary @premises_partial
  Scenario: Premises Partial When Wrong Apartment Unit Is Provided
    Given the API endpoint for premises-partial-when-wrong-apartment-unit-is-provided test is "/avs/v1.0/verifyAddress"
    And the request body for premises-partial-when-wrong-apartment-unit-is-provided with unit is prepared with the following details
      | street1 | street2 | city | stateOrProvince | postalCode | country |
      | 5 Goldfinch rd | unit 3 | Lincoln | nh | 03251 | US |
    When I send a POST request for premises-partial-when-wrong-apartment-unit-is-provided to the address verification service
    Then the HTTP response status for premises-partial-when-wrong-apartment-unit-is-provided should be 200
    And the response code for premises-partial-when-wrong-apartment-unit-is-provided should be "PREMISES_PARTIAL"
    And the validatedAddress should be null for premises-partial-when-wrong-apartment-unit-is-provided

    And the response matches the expected schema