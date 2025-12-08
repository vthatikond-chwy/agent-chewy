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

Given('the API endpoint for verify-address-with-missing-required-fields test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for verify-address-with-missing-required-fields test is missing required fields', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    city: data.city,
    country: data.country
  };
});

When('I send a POST request for verify-address-with-missing-required-fields to the verifyAddress endpoint', async function (this: CustomWorld) {
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

Then('the response status code should be 400 for verify-address-with-missing-required-fields test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(400);
});

Then('the response body should include an error message {string} for verify-address-with-missing-required-fields test', function (this: CustomWorld, expectedErrorMessage: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.include(expectedErrorMessage);
});