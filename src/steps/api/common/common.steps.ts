import { Given, Then, World } from '@cucumber/cucumber';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

interface CustomWorld extends World {
  response?: AxiosResponse;
}

Then('the response status code should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
});

Given('I am authorized to access the {string} endpoint', function (this: CustomWorld, endpoint: string) {
  // Authorization setup - can be customized based on authentication requirements
  // For now, this is a placeholder that can be extended
});

