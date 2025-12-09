Feature: Verify Address API Validation

  @verifyAddress @positive
  Scenario: Verify a valid residential address returns VERIFIED
    Given the API endpoint for verify-a-valid-residential-address-returns-verified test is "/avs/v1.0/verifyAddress"
    And the request body for verify-a-valid-residential-address-returns-verified is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for verify-a-valid-residential-address-returns-verified
    Then the response status for verify-a-valid-residential-address-returns-verified should be 200
    And the response code for verify-a-valid-residential-address-returns-verified should be "VERIFIED"
    And the response matches the expected schema