Feature: Verify Address API Authentication

  @api @verifyAddress @security
  Scenario: Verify address without authentication
    Given the API endpoint for verify-address-without-authentication test is "/avs/v1.0/verifyAddress"
    And the request body for verify-address-without-authentication is
      | streets          | city    | stateOrProvince | postalCode | country |
      | 400 S Orange Ave | Orlando | FL              | 32801      | US      |
    When I send a POST request for verify-address-without-authentication without authentication
    Then the response status for verify-address-without-authentication should be 401
    And the response for verify-address-without-authentication should include an error message "Unauthorized"