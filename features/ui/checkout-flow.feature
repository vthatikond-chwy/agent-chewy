Feature: Recorded User Flow
  Automated test generated from browser recording

  Scenario: Execute recorded actions
    Given I navigate to "https://www-stg.chewy.net/"
    When I click on account link
    When I click on email field
    When I enter "vthatikond@chewy.com" into email field
    When I click on continue button
    When I click on password field
    When I enter "Rainbow!234" into password field
    When I click on sign in button
    When I click on element
    When I enter "dog toys" into search field
    When I click on element
    When I click on product link
    When I click on add to cart button
    When I click on proceed to checkout button
    When I click on payment method
    When I click on place order button
    When I click on element
    When I enter "123456" into field
    When I click on element
    Then I should see the order confirmation page
    When I click on element