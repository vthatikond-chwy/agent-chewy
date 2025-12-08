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

Given('the API endpoint for suggest-addresses-on-invalid-input test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for suggest-addresses-on-invalid-input is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    country: data.country,
    addressType: data.addressType,
    engine: data.engine,
    maxSuggestions: parseInt(data.maxSuggestions, 10),
  };
});

When('I send a POST request for suggest-addresses-on-invalid-input', async function (this: CustomWorld) {
  try {
    const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
    this.response = response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      this.response = error.response;
    } else {
      throw error;
    }
  }
});

Then('the response status for suggest-addresses-on-invalid-input should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response for suggest-addresses-on-invalid-input should contain at least 1 suggestion', function (this: CustomWorld) {
  expect(this.response?.data).to.be.an('array').that.is.not.empty;
});

Then('the responseCode should not be VERIFIED for any suggestion in suggest-addresses-on-invalid-input', function (this: CustomWorld) {
  const suggestions = this.response?.data;
  suggestions.forEach((suggestion: any) => {
    expect(suggestion.responseCode).to.not.equal('VERIFIED');
  });
});