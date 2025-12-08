Feature: Validate Correct Residential Address

  @avs @addressValidation
  Scenario: Validate Correct Residential Address
    Given the API endpoint for validate-correct-residential-address test is "/avs/v1.0/verifyAddress"
    And the request body for validate-correct-residential-address is:
      | streets | city | stateOrProvince | postalCode | country |
      | 600 HARLAN CT | Bonaire | GA | 31005-5427 | US |
    When I send a POST request for validate-correct-residential-address
    Then the response status for validate-correct-residential-address should be 200
    And the response code for validate-correct-residential-address should be "VERIFIED"
    And the validatedAddress for validate-correct-residential-address should not be null
    And the validatedAddress.city for validate-correct-residential-address should be "Fort Lauderdale"
    And the validatedAddress.postalCode for validate-correct-residential-address should start with "33301"
    And the validatedAddress.addressType for validate-correct-residential-address should be "RESIDENTIAL"
    And the validatedAddress.country for validate-correct-residential-address should be "US"