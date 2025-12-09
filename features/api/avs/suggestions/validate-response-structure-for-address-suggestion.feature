Feature: Validate response structure for address suggestion

  @responseStructure @suggestionValidation @api @positive
  Scenario: Validate response structure for address suggestion
    Given the API endpoint for validate-response-structure-for-address-suggestion test is "/avs/v1.0/verifyAddress"
    And the request body for validate-response-structure-for-address-suggestion is:
      | streets                | city          | stateOrProvince | country |
      | 600 HARLAN CT | Bonaire | GA | US |
    When I send a POST request for validate-response-structure-for-address-suggestion
    Then the response status for validate-response-structure-for-address-suggestion should be 200
    And the response matches the expected schema
    And each item in the response array should contain cityChanged, postalChanged, and validatedAddress fields for validate-response-structure-for-address-suggestion