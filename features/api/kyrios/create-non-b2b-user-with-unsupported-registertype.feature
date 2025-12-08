Feature: Validate unsupported RegisterType for non-B2B user creation

  @userCreation @negative
  Scenario: Create non-B2B user with unsupported RegisterType
    Given the API endpoint for create-non-b2b-user-with-unsupported-registertype test is "/v1/users"
    And the request body for create-non-b2b-user-with-unsupported-registertype is prepared with the following user details
      | firstName | lastName | registerType |
      | Jane      | Doe      | XYZ          |
    And the address for create-non-b2b-user-with-unsupported-registertype is added with the following details
      | streets          | city        | state | postcode | country |
      | 456 Maple Street | Springfield | IL    | 62704    | US      |
    When I send a POST request for create-non-b2b-user-with-unsupported-registertype
    Then the response status for create-non-b2b-user-with-unsupported-registertype should be 422
    And the response for create-non-b2b-user-with-unsupported-registertype should include a message indicating unsupported RegisterType