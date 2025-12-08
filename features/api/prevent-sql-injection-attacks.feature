Feature: Prevent SQL Injection attacks in AVS API

  @api @security
  Scenario: Ensure API is secure against SQL Injection by escaping special characters
    Given the API endpoint for prevent-sql-injection-attacks test is "/avs/v1.0/suggestAddresses"
    And the request body for prevent-sql-injection-attacks contains:
      | streets                         | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT; DROP TABLE Users; | Bonaire | GA              | 31005-5427 | US      |
    When I send a POST request for prevent-sql-injection-attacks
    Then the response status for prevent-sql-injection-attacks should be 200
    And the response for prevent-sql-injection-attacks does not contain database error
    And the response for prevent-sql-injection-attacks contains 'NOT_VERIFIED' as responseCode