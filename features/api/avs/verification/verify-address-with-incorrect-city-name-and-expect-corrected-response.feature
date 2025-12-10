Feature: Verify Address Correction for Incorrect City Name

  @addressVerification @correctedResponse
  Scenario: Verify Address with Incorrect City Name and Expect Corrected Response
    Given the API endpoint for verify-address-with-incorrect-city-name-and-expect-corrected-response test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-incorrect-city-name-and-expect-corrected-response is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonair | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-incorrect-city-name-and-expect-corrected-response
    Then the response status for verify-address-with-incorrect-city-name-and-expect-corrected-response should be 200
    And the response code for verify-address-with-incorrect-city-name-and-expect-corrected-response should be "CORRECTED"
    And the cityChanged field for verify-address-with-incorrect-city-name-and-expect-corrected-response should be true
    And the validatedAddress should be populated for verify-address-with-incorrect-city-name-and-expect-corrected-response
    And the requestAddressSanitized should be null for verify-address-with-incorrect-city-name-and-expect-corrected-response
    And the response matches the expected schema