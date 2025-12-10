Feature: Verify address with empty postal code functionality

  @verifyAddress @postalCode @api @positive
  Scenario: Verify address with empty postal code
    Given the API endpoint for verify-address-with-empty-postal-code test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-empty-postal-code is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-empty-postal-code
    Then the response status for verify-address-with-empty-postal-code should be 200
    And the response code for verify-address-with-empty-postal-code should be "CORRECTED"
    And the postalChanged field for verify-address-with-empty-postal-code should be true
    And the response matches the expected schema
    And the validatedAddress.postalCode for verify-address-with-empty-postal-code should not be empty