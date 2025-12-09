Feature: Verify Address Validation Errors

  @verifyAddress @negative
  Scenario: Verify an address missing postal code returns validation error
    Given the API endpoint for verify-an-address-missing-postal-code-returns-validation-error test is "/avs/v1.0/verifyAddress"
    And the request body for verify-an-address-missing-postal-code-returns-validation-error is:
      | streets        | city       | stateOrProvince | country | addressType |
      | 123 Invalid St | Nowhere | XX | US | RESIDENTIAL |
    When I send a POST request for verify-an-address-missing-postal-code-returns-validation-error
    Then the response status for verify-an-address-missing-postal-code-returns-validation-error should be 400
    And the response code for verify-an-address-missing-postal-code-returns-validation-error should be "not VERIFIED"
    And the response message for verify-an-address-missing-postal-code-returns-validation-error contains "postal code is required"
    And the response matches the expected schema