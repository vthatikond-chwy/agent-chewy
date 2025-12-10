Feature: Verify Address with Incorrect State Expecting Corrected Response

  @addressVerification @stateCorrection
  Scenario: Verify address with incorrect state expecting corrected response
    Given the API endpoint for verify-address-with-incorrect-state-expecting-corrected-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-incorrect-state-expecting-corrected-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | FL | 31005-5427 | US |
    When I send a POST request for verify-address-with-incorrect-state-expecting-corrected-response
    Then the response status for verify-address-with-incorrect-state-expecting-corrected-response should be 200
    And the response code for verify-address-with-incorrect-state-expecting-corrected-response should be "CORRECTED"
    And the stateProvinceChanged field for verify-address-with-incorrect-state-expecting-corrected-response should be true
    And the validatedAddress should not be null for verify-address-with-incorrect-state-expecting-corrected-response
    And the requestAddressSanitized should be null for verify-address-with-incorrect-state-expecting-corrected-response
    And the response matches the expected schema