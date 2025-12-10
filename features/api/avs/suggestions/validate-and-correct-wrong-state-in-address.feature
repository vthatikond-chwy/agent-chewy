Feature: Validate and correct wrong state in address

  @addressValidation @correction
  Scenario: Validate and correct wrong state in address
    Given the API endpoint for validate-and-correct-wrong-state-in-address test is "/avs/v1.0/verifyAddress"
    And the request body for validate-and-correct-wrong-state-in-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | FL | 31005-5427 | US |
    When I send a POST request for validate-and-correct-wrong-state-in-address
    Then the response status for validate-and-correct-wrong-state-in-address should be 200
    And the response code for validate-and-correct-wrong-state-in-address should be "CORRECTED"
    And the stateProvinceChanged field for validate-and-correct-wrong-state-in-address should be true
    And the validatedAddress should not be null for validate-and-correct-wrong-state-in-address
    And the requestAddressSanitized should be null for validate-and-correct-wrong-state-in-address
    And the response matches the expected schema