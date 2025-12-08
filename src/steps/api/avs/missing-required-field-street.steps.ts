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
}

Given('the API endpoint for missing-required-field-street test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for missing-required-field-street test without "streets" field is', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    city: addressData.city,
    country: addressData.country,
    postalCode: addressData.postalCode,
    stateOrProvince: addressData.stateOrProvince,
    // streets field intentionally omitted
  };
});

When('I send a POST request for missing-required-field-street', async function (this: CustomWorld) {
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

Then('the response status code should be 400 for missing-required-field-street test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(400);
});

Then('the response for missing-required-field-street test should contain an error message {string}', function (this: CustomWorld, expectedMessage: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include(expectedMessage);
});