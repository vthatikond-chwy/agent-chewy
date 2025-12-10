Feature: Verify CORRECTED Response for Address with Missing State

  @avs @verifyAddress @api @positive
  Scenario: Verify CORRECTED Response for Address with Missing State
    Given the API endpoint for verify-corrected-response-for-address-with-missing-state test is "/avs/v1.0/verifyAddress"
    And the request body for verify-corrected-response-for-address-with-missing-state is
      | streets      | city        | postalCode | country |
      | 39 Dolores Dr | Burlington | 01803      | US      |
    When I send a POST request for verify-corrected-response-for-address-with-missing-state
    Then the HTTP response status code should be 200 for verify-corrected-response-for-address-with-missing-state
    And the response code for verify-corrected-response-for-address-with-missing-state should be "CORRECTED"
    And the stateProvinceChanged field for verify-corrected-response-for-address-with-missing-state should be true
    And the validatedAddress should be populated for verify-corrected-response-for-address-with-missing-state
    And the requestAddressSanitized should be null for verify-corrected-response-for-address-with-missing-state
    And the response matches the expected schema