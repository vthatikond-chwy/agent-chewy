Feature: SQL Injection Attack Prevention on Address Verification Service

  @security @injection
  Scenario: Ensure the API is protected against SQL injection attacks
    Given the API endpoint for sql-injection-attack-prevention test is "/avs/v1.0/suggestAddresses"
    And the request body for sql-injection-attack-prevention contains malicious SQL code
      | streets                  | city    | stateOrProvince | postalCode  | country |
      | 1'; DROP TABLE users; -- | Bonaire | GA              | 31005-5427  | US      |
    When I send a POST request for sql-injection-attack-prevention to suggest addresses
    Then the response status for sql-injection-attack-prevention should be 400
    And the error message for sql-injection-attack-prevention does not reveal sensitive information
    And the system remains unaffected by the sql-injection-attack-prevention input