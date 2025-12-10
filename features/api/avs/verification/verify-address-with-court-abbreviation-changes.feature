Feature: Verify address with COURT abbreviation changes

  @addressVerification @streetAbbreviation
  Scenario: Verify address with COURT abbreviation changes
    Given the API endpoint for verify-address-with-court-abbreviation-changes test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-with-court-abbreviation-changes is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN COURT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-address-with-court-abbreviation-changes
    Then the response status for verify-address-with-court-abbreviation-changes should be 200
    And the response code for verify-address-with-court-abbreviation-changes should be "VERIFIED"
    And the streetChanged field for verify-address-with-court-abbreviation-changes should be true
    And the cityChanged field for verify-address-with-court-abbreviation-changes should be false
    And the postalChanged field for verify-address-with-court-abbreviation-changes should be false
    And the stateProvinceChanged field for verify-address-with-court-abbreviation-changes should be false
    And the requestAddressSanitized should be null for verify-address-with-court-abbreviation-changes
    And the validatedAddress should be populated for verify-address-with-court-abbreviation-changes
    And the response matches the expected schema