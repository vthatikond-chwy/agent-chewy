Feature: Verify Address API Response Validation

  @verifyAddress @positive
  Scenario: Verify valid complete address returns VERIFIED response
    Given the API endpoint for verify-valid-complete-address-returns-verified-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-valid-complete-address-returns-verified-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-valid-complete-address-returns-verified-response
    Then the response status for verify-valid-complete-address-returns-verified-response should be 200
    And the response code for verify-valid-complete-address-returns-verified-response should be "VERIFIED"
    And the cityChanged field for verify-valid-complete-address-returns-verified-response should be false
    And the postalChanged field for verify-valid-complete-address-returns-verified-response should be false
    And the stateProvinceChanged field for verify-valid-complete-address-returns-verified-response should be false
    And the streetChanged field for verify-valid-complete-address-returns-verified-response should be false
    And the validatedAddress should be populated for verify-valid-complete-address-returns-verified-response
    And the requestAddressSanitized should be null for verify-valid-complete-address-returns-verified-response
    And the response matches the expected schema