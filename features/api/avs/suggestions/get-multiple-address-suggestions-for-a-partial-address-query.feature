Feature: Get multiple address suggestions for a partial address query

  @suggestAddresses @positive
  Scenario: Get multiple address suggestions for a partial address query
    Given the API endpoint for get-multiple-address-suggestions-for-a-partial-address-query test is "/avs/v1.0/suggestAddresses"
    And the request body for get-multiple-address-suggestions-for-a-partial-address-query is:
      | streets             | city          | country | maxSuggestions |
      | 1600 Amphitheatre Pkwy | Mountain View | US | 5 |
    When I send a POST request for get-multiple-address-suggestions-for-a-partial-address-query
    Then the response status for get-multiple-address-suggestions-for-a-partial-address-query should be 200
    And the response matches the expected schema
    And the number of suggestions for get-multiple-address-suggestions-for-a-partial-address-query is greater than 1
    And the suggestions for get-multiple-address-suggestions-for-a-partial-address-query contain "Springfield"