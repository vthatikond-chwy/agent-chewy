Feature: Check handling of non-US country code in address verification service

  @api @international
  Scenario: Verify API response for address with non-US country code
    Given the API endpoint for check-handling-of-non-us-country-code test is "/avs/v1.0/suggestAddresses"
    And the request body for check-handling-of-non-us-country-code test is:
      | streets       | city    | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA              | 31005-5427 | CA      |
    When I send a POST request for check-handling-of-non-us-country-code
    Then the response status code should be 200 for check-handling-of-non-us-country-code test
    And the response for check-handling-of-non-us-country-code test should contain "NOT_VERIFIED" as responseCode or an error message regarding unsupported country code