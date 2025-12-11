Feature: Chewy Test
  Complete checkout flow

  Scenario: Execute recorded actions
    Given I navigate to "https://www-stg.chewy.net/"
    When I click on account link
    When I click on email field
    When I enter "vthatikond@chewy.com" into email field
    When I click on continue button
    When I click on password field
    When I enter "Rainbow!234" into password field
    When I click on sign in button
    When I navigate to "https://www-stg.chewy.net/"