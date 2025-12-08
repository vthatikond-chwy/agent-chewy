Feature: Validate API behavior for creating users without required fields

  @userCreation @negative
  Scenario: Create non-B2B user without required fields
    Given the API endpoint for create-non-b2b-user-without-required-fields test is "/v1/users"
    And the request body for create-non-b2b-user-without-required-fields is:
      | registerType | R |
    When I send a POST request for create-non-b2b-user-without-required-fields
    Then the response status for create-non-b2b-user-without-required-fields should be 400
    And the response for create-non-b2b-user-without-required-fields should include a message indicating missing required fields