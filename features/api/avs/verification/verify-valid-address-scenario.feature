Feature: Verify Valid Address Functionality

  @addressVerification @positive
  Scenario: Verify Valid Address Scenario
    Given the API endpoint for verify-valid-address-scenario test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-address-scenario is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-valid-address-scenario
    Then the response status for verify-valid-address-scenario should be 200
    And the response code for verify-valid-address-scenario should be "VERIFIED"
    And the cityChanged field for verify-valid-address-scenario should be false
    And the postalChanged field for verify-valid-address-scenario should be false
    And the stateProvinceChanged field for verify-valid-address-scenario should be false
    And the streetChanged field for verify-valid-address-scenario should be false
    And the validatedAddress should be populated for verify-valid-address-scenario
    And the requestAddressSanitized should be null for verify-valid-address-scenario
    And the response matches the expected schema