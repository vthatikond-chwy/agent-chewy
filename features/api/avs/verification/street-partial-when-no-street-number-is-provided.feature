Feature: Street Partial When No Street Number Is Provided

  @api @verifyAddress @boundary @street_partial
  Scenario: Street Partial When No Street Number Is Provided
    Given the API endpoint for street-partial-when-no-street-number-is-provided test is "/avs/v1.0/verifyAddress"
    And the request body for street-partial-when-no-street-number-is-provided is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | Dolores Dr | Burlington | ma | 01803 | US |
    When I send a POST request for street-partial-when-no-street-number-is-provided to the address verification service
    Then the HTTP response status for street-partial-when-no-street-number-is-provided should be 200
    And the response code for street-partial-when-no-street-number-is-provided should be "STREET_PARTIAL"
    And the validatedAddress should be null for street-partial-when-no-street-number-is-provided

    And the response matches the expected schema