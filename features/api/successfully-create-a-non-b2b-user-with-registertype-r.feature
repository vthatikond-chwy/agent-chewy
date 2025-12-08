Feature: Successfully create a non-B2B user with RegisterType R

  @user_creation @positive
  Scenario: Successfully create a non-B2B user with RegisterType R
    Given the API endpoint for successfully-create-a-non-b2b-user-with-registertype-r test is "/v1/users"
    And the request body for successfully-create-a-non-b2b-user-with-registertype-r is:
      | firstName   | lastName | fullName | registerType |
      | John        | Doe      | John Doe | R            |
    When I send a POST request for successfully-create-a-non-b2b-user-with-registertype-r
    Then the response status code should be 200 for successfully-create-a-non-b2b-user-with-registertype-r
    And the response for successfully-create-a-non-b2b-user-with-registertype-r contains a valid ID