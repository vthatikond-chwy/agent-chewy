Feature: Add Dog Food to Cart
  This test plan verifies that a user can log in to Chewy and add a specific dog food product to their shopping cart.

  Scenario: Login and Add Dog Food to Cart
    Given I navigate to "https://www-stg.chewy.net"
    When I click on "Sign In link"
    When I type "vthatikond" into "email input field"
    When I type "vthatikond" into "password input field"
    When I click on "Sign In button"
    And I wait for ""
    Given I navigate to "https://www-stg.chewy.net"
    When I click on "Add to Cart button"
