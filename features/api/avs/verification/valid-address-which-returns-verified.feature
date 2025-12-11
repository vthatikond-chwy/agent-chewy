Feature: Valid Address Which Returns Verified

  @api @verifyAddress @positive @verified
  Scenario: Valid Address Which Returns Verified
    Given the API endpoint for valid-address-which-returns-verified test is "/avs/v1.0/verifyAddress"
    And the request body for valid-address-which-returns-verified is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington | ma | 01803 | US |
    When I send a POST request for valid-address-which-returns-verified to the address verification service
    Then the HTTP response status for valid-address-which-returns-verified should be 200
    And the response code for valid-address-which-returns-verified should be "VERIFIED"
    And the validatedAddress should be populated for valid-address-which-returns-verified
    And the requestAddressSanitized should be null for valid-address-which-returns-verified
    And the response matches the expected schema