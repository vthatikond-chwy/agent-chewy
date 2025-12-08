Feature: Ensure missing required fields return errors in AVS API

  @api @errorHandling
  Scenario: Ensure missing required fields return errors
    Given the API endpoint for ensure-missing-required-fields-return-errors test is "/avs/v1.0/suggestAddresses"
    And the request body for ensure-missing-required-fields-return-errors does not include "streets" field
      | city          | stateOrProvince | postalCode  | country |
      | Bonaire       | GA              | 31005-5427  | US      |
    When I send a POST request for ensure-missing-required-fields-return-errors
    Then the response status code should be 400 for ensure-missing-required-fields-return-errors
    And the response contains error message about missing "streets" field for ensure-missing-required-fields-return-errors