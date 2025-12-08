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

Given('the API endpoint for unsupported-country test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for unsupported-country test is', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for unsupported-country to suggest addresses', async function (this: CustomWorld) {
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

Then('the response code should be 200 for unsupported-country test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response for unsupported-country should indicate {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validated address country in the response should be {string} for unsupported-country test', function (this: CustomWorld, expectedCountry: string) {
  const responseBody = this.response?.data;
  expect(responseBody.validatedAddress.country).to.equal(expectedCountry);
});