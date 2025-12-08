Feature: Validate API error handling for user creation without required fields

  @user_creation @negative
  Scenario: Attempt to create user without required fields
    Given the API endpoint for attempt-to-create-user-without-required-fields test is "/v1/users"
    And the request body for attempt-to-create-user-without-required-fields does not include "firstName", "lastName", and "fullName"
      | registerType | R |
    When I send a POST request for attempt-to-create-user-without-required-fields
    Then the response code for attempt-to-create-user-without-required-fields should be 400
    And the error message for attempt-to-create-user-without-required-fields indicates missing required fields