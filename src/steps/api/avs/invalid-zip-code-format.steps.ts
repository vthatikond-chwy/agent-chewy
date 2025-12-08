import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse<any>;
}

Given('the API endpoint for invalid-zip-code-format test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for invalid-zip-code-format test is:', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for invalid-zip-code-format', async function (this: CustomWorld) {
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

Then('the response status code should be 200 for invalid-zip-code-format test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response for invalid-zip-code-format test should indicate the postal code was not verified or corrected', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal('NOT_VERIFIED');
});

Then('the postalChanged flag should be true for invalid-zip-code-format test', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('postalChanged');
  expect(responseBody.postalChanged).to.be.true;
});