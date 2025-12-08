Feature: Create non-B2B user with valid data

  @userCreation @positive
  Scenario: Successfully create a non-B2B user with RegisterType R
    Given the API endpoint for create-non-b2b-user-with-valid-data test is "/v1/users"
    And the request body for create-non-b2b-user-with-valid-data is prepared with the following user details
      | firstName | lastName | registerType |
      | John      | Doe      | R            |
    And the address for create-non-b2b-user-with-valid-data is added with the following details
      | streets         | city        | state | postcode | country |
      | 123 Cherry Lane | Springfield | IL    | 62704    | US      |
    When I send a POST request for create-non-b2b-user-with-valid-data
    Then the response status code should be 200 for create-non-b2b-user-with-valid-data
    And the response should include a valid user ID for create-non-b2b-user-with-valid-data
    And the registerType in the response should be R for create-non-b2b-user-with-valid-data