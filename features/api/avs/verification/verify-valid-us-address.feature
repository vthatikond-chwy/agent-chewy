Feature: Verify Address API Validation

  @addressVerification @verifyAddress @api @positive
  Scenario: Verify valid US address
    Given the API endpoint for verify-valid-us-address test is "/avs/v1.0/verifyAddress"
    And the request headers for verify-valid-us-address include:
      | Content-Type | application/json |
    And the request body for verify-valid-us-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 1600 Amphitheatre Parkway | Mountain View | CA | 94043 | US |
    When I send a POST request for verify-valid-us-address
    Then the response status code for verify-valid-us-address should be 200
    And the response body for verify-valid-us-address should have a responseCode of "VERIFIED"