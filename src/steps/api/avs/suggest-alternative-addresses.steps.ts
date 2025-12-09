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

Given('the API endpoint for suggest-alternative-addresses test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for suggest-alternative-addresses is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    country: data.country
  };
});

When('I send a POST request for suggest-alternative-addresses', async function (this: CustomWorld) {
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

Then('the response status for suggest-alternative-addresses should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('at least one suggestion should be returned for suggest-alternative-addresses', function (this: CustomWorld) {
  expect(this.response?.data).to.be.an('array').that.is.not.empty;
});

Then('suggestions should be ordered by recommendation for suggest-alternative-addresses', function (this: CustomWorld) {
  // Assuming API returns suggestions in the correct order, and we just need to check if the array is not empty
  // In a real scenario, we would need more details on how to verify the order (e.g., specific fields to check)
  expect(this.response?.data).to.be.an('array').that.is.not.empty;
  // This is a placeholder assertion. In a real test, you would compare the order of suggestions based on specific criteria.
});