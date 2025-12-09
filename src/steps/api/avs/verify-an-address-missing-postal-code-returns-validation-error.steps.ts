import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';

dotenv.config();

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse<any>;
}

Given('the API endpoint for verify-an-address-missing-postal-code-returns-validation-error test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for verify-an-address-missing-postal-code-returns-validation-error is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    country: data.country,
    addressType: data.addressType,
  };
});

When('I send a POST request for verify-an-address-missing-postal-code-returns-validation-error', async function (this: CustomWorld) {
  try {
    const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
    this.response = response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      this.response = error.response;
    } else {
      throw error;
    }
  }
});

Then('the response status for verify-an-address-missing-postal-code-returns-validation-error should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
});

Then('the response code for verify-an-address-missing-postal-code-returns-validation-error should be {string}', function (this: CustomWorld, expectedCode: string) {
  const actualCode = this.response?.data.responseCode;
  expect(actualCode).to.equal(expectedCode);
});

Then('the response message for verify-an-address-missing-postal-code-returns-validation-error contains {string}', function (this: CustomWorld, expectedMessage: string) {
  const actualMessage = this.response?.data.message;
  expect(actualMessage).to.include(expectedMessage);
});