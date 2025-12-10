Feature: Verify correct handling of wrong street number for address validation

  @addressVerification @streetNumber
  Scenario: Verify correct handling of wrong street number
    Given the API endpoint for verify-correct-handling-of-wrong-street-number test is "/avs/v1.0/verifyAddress"
    And the request body for verify-correct-handling-of-wrong-street-number is:
      | streets | city | stateOrProvince | postalCode | country |
      | 999 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-correct-handling-of-wrong-street-number
    Then the response status for verify-correct-handling-of-wrong-street-number should be 200
    And the response code for verify-correct-handling-of-wrong-street-number should be "STREET_PARTIAL"
    And the validatedAddress should be null for verify-correct-handling-of-wrong-street-number
    And the response matches the expected schema