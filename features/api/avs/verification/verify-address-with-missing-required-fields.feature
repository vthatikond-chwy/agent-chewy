Feature: Verify Address with Missing Required Fields

  @addressValidation @negativeTest
  Scenario: Verify Address with Missing Required Fields
    Given the API endpoint for verify-address-with-missing-required-fields test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-missing-required-fields is:
      | streets       | city   | stateOrProvince | postalCode | country |
      | 123 Main St | Somewhere | CA |  | US |
    When I send a POST request for verify-address-with-missing-required-fields
    Then the response status for verify-address-with-missing-required-fields should be 200
    And the response matches the expected schema
    And the response code for verify-address-with-missing-required-fields should be "VERIFIED"
    And the validatedAddress should be null for verify-address-with-missing-required-fields
    And the requestAddressSanitized should be populated for verify-address-with-missing-required-fields
    And the postalChanged field for verify-address-with-missing-required-fields should be false
    And the cityChanged field for verify-address-with-missing-required-fields should be false
    And the stateProvinceChanged field for verify-address-with-missing-required-fields should be false
    And the streetChanged field for verify-address-with-missing-required-fields should be false