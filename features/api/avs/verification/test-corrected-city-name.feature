Feature: Verify Corrected City Name in Address Validation

  @addressVerification @cityCorrection
  Scenario: Test Corrected City Name
    Given the API endpoint for test-corrected-city-name test is "/avs/v1.0/verifyAddress"
    And the request body for test-corrected-city-name is
      | streets | city | stateOrProvince | postalCode | country |
      | 1600 Amphitheatre Pkwy | Wrong City | CA | 94043 | US |
    When I send a POST request for test-corrected-city-name
    Then the response code for test-corrected-city-name should be 200
    And the response code for test-corrected-city-name should be "CORRECTED"
    And the cityChanged field for test-corrected-city-name should be true
    And the validatedAddress should be populated for test-corrected-city-name
    And the requestAddressSanitized should be null for test-corrected-city-name
    And the response matches the expected schema