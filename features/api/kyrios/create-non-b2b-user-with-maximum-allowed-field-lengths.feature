Feature: Validate maximum field lengths for non-B2B user creation

  @userCreation @boundary
  Scenario: Create non-B2B user with maximum allowed field lengths
    Given the API endpoint for create-non-b2b-user-with-maximum-allowed-field-lengths test is "/v1/users"
    And the request body for create-non-b2b-user-with-maximum-allowed-field-lengths is prepared with the following user details
      | firstName    | lastName    | registerType |
      | Maximillian  | Alexander   | R            |
    And the address for create-non-b2b-user-with-maximum-allowed-field-lengths is added with the following details
      | streets                                                       | city         | state | postcode | country |
      | 123456789012345678901234567890123456789012345678901234567890 | Springfield  | IL    | 62704    | US      |
    When I send a POST request for create-non-b2b-user-with-maximum-allowed-field-lengths
    Then the response status code for create-non-b2b-user-with-maximum-allowed-field-lengths should be 200
    And the response for create-non-b2b-user-with-maximum-allowed-field-lengths should include a valid user ID
    And firstName and lastName for create-non-b2b-user-with-maximum-allowed-field-lengths should be accepted at their maximum lengths