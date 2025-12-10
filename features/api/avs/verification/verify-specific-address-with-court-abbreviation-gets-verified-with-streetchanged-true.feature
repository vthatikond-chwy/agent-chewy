Feature: Verify specific address with COURT abbreviation normalization

  @addressVerification @courtAbbreviation
  Scenario: Verify specific address with COURT abbreviation gets verified with streetChanged true
    Given the API endpoint for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true test is "/avs/v1.0/verifyAddress"
    And the request body for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN COURT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true
    Then the response status for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be 200
    And the response code for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be "VERIFIED"
    And the streetChanged field for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be true
    And the cityChanged field for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be false
    And the postalChanged field for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be false
    And the stateProvinceChanged field for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true should be false
    And the validatedAddress should be populated for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true
    And the requestAddressSanitized should be null for verify-specific-address-with-court-abbreviation-gets-verified-with-streetchanged-true
    And the response matches the expected schema