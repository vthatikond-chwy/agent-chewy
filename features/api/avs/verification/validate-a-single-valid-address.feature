Feature: Validate a single valid address

  @avs @addressValidation
  Scenario: Validate a single valid address
    Given the API endpoint for validate-a-single-valid-address test is "/avs/v1.0/verifyAddress"
    And the request body for validate-a-single-valid-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for validate-a-single-valid-address
    Then the response status for validate-a-single-valid-address should be 200
    And the response code for validate-a-single-valid-address should be "VERIFIED"
    And the cityChanged field for validate-a-single-valid-address should be false
    And the postalChanged field for validate-a-single-valid-address should be false
    And the stateProvinceChanged field for validate-a-single-valid-address should be false
    And the streetChanged field for validate-a-single-valid-address should be false
    And the requestAddressSanitized should be null for validate-a-single-valid-address
    And the validatedAddress should be populated for validate-a-single-valid-address
    And the response matches the expected schema