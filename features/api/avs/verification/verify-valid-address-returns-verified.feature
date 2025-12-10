Feature: Verify Valid Address Returns Verified

  @api @verifyAddress @positive @verified
  Scenario: Verify Valid Address Returns Verified
    Given the API endpoint for verify-valid-address-returns-verified test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-address-returns-verified is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington | ma | 01803 | US |
    When I send a POST request for verify-valid-address-returns-verified to the address verification service
    Then the HTTP response status for verify-valid-address-returns-verified should be 200
    And the response code for verify-valid-address-returns-verified should be "VERIFIED"
    And the validatedAddress should be populated for verify-valid-address-returns-verified
    And the requestAddressSanitized should be null for verify-valid-address-returns-verified
    And the response matches the expected schema