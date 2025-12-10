Feature: Valid Address

  @api @verifyAddress @positive @verified
  Scenario: Valid Address
    Given the API endpoint for valid-address test is "/avs/v1.0/verifyAddress"
    And the request body for valid-address is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington | ma | 01803 | US |
    When I send a POST request for valid-address to the address verification service
    Then the HTTP response status for valid-address should be 200
    And the response code for valid-address should be "VERIFIED"
    And the validatedAddress should be populated for valid-address
    And the requestAddressSanitized should be null for valid-address
    And the response matches the expected schema