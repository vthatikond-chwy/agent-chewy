Feature: GoogleSearchPlaywright
  Test the functionality of searching for 'playwright' on Google.

  Scenario: Search for Playwright on Google
    Given I navigate to "https://www.google.com"
    When I type "playwright" into "input[name='q']"
    When I click on "input[name='btnK']"
