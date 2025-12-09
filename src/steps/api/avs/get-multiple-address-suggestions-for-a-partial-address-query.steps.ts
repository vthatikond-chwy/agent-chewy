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

Given('the API endpoint for get-multiple-address-suggestions-for-a-partial-address-query test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for get-multiple-address-suggestions-for-a-partial-address-query is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    country: data.country,
    maxSuggestions: parseInt(data.maxSuggestions, 10),
  };
});

When('I send a POST request for get-multiple-address-suggestions-for-a-partial-address-query', async function (this: CustomWorld) {
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

Then('the response status for get-multiple-address-suggestions-for-a-partial-address-query should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the number of suggestions for get-multiple-address-suggestions-for-a-partial-address-query is greater than 1', function (this: CustomWorld) {
  expect(this.response?.data).to.be.an('array').that.has.lengthOf.above(1);
});

Then('the suggestions for get-multiple-address-suggestions-for-a-partial-address-query contain {string}', function (this: CustomWorld, expectedCity: string) {
  const suggestionsContainExpectedCity = this.response?.data.some((suggestion: any) => suggestion.requestAddress.city.toUpperCase() === expectedCity.toUpperCase());
  expect(suggestionsContainExpectedCity).to.be.true;
});