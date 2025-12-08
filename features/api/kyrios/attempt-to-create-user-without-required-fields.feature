Feature: Validate system response for user creation without required fields

  @userCreation @negative @highPriority
  Scenario: Attempt to create user without required fields
    Given the API endpoint for attempt-to-create-user-without-required-fields test is "/v1/users"
    And the request body for attempt-to-create-user-without-required-fields is:
      | registerType | R |
    When I send a POST request for attempt-to-create-user-without-required-fields to create a user without required fields
    Then the response status code should be 422 for attempt-to-create-user-without-required-fields
    And the response body should contain an error message for missing required fields for attempt-to-create-user-without-required-fields
    And the response header "Content-Type" should be "application/json" for attempt-to-create-user-without-required-fields