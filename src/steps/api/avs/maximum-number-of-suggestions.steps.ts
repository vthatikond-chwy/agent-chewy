import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

interface CustomWorld extends World {
  baseUrl: string;
  endpoint: string;
  headers: Record<string, string>;
  requestBody: any;
  response?: AxiosResponse;
  maxSuggestions: number;
}

Given('the API endpoint for maximum-number-of-suggestions test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for maximum-number-of-suggestions test is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    city: addressData.city,
    country: addressData.country,
    postalCode: addressData.postalCode,
    stateOrProvince: addressData.stateOrProvince,
    streets: [addressData.streets],
  };
});

Given('the maxSuggestions for maximum-number-of-suggestions test is {int}', function (this: CustomWorld, maxSuggestions: number) {
  this.maxSuggestions = maxSuggestions;
});

When('I send a POST request for maximum-number-of-suggestions', async function (this: CustomWorld) {
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

Then('the response status code should be 200 for maximum-number-of-suggestions test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the number of suggestions should not exceed 5 for maximum-number-of-suggestions test', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.suggestions).to.have.lengthOf.at.most(this.maxSuggestions);
});