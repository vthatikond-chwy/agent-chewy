Feature: Verify Valid Complete Address Returns VERIFIED Response

  @api @verifyAddress @positive
  Scenario: Verify Valid Complete Address Returns VERIFIED Response
    Given the API endpoint for verify-valid-complete-address-returns-verified-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-complete-address-returns-verified-response is prepared with the following details
      | streets | city | stateOrProvince | postalCode | country |
      | 39 Dolores Dr | Burlington | MA | 01803 | US |
    When I send a POST request for verify-valid-complete-address-returns-verified-response to the address verification service
    Then the HTTP response status for verify-valid-complete-address-returns-verified-response should be 200
    And the response code for verify-valid-complete-address-returns-verified-response should be "VERIFIED"
    And the validatedAddress should be populated for verify-valid-complete-address-returns-verified-response
    And the requestAddressSanitized should be null for verify-valid-complete-address-returns-verified-response
    And the response matches the expected schema