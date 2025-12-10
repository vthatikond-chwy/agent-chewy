Feature: Missing State Returns Corrected

  @api @verifyAddress @negative @corrected
  Scenario: Missing State Returns Corrected
    Given the API endpoint for missing-state-returns-corrected test is "/avs/v1.0/verifyAddress"
    And the request body for missing-state-returns-corrected is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington |  | 01803 | US |
    When I send a POST request for missing-state-returns-corrected to the address verification service
    Then the HTTP response status for missing-state-returns-corrected should be 200
    And the response code for missing-state-returns-corrected should be "CORRECTED"
    And the validatedAddress should be populated for missing-state-returns-corrected

    And the response matches the expected schema