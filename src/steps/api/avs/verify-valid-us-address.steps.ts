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

Given('the API endpoint for verify-valid-us-address test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = { 'Content-Type': 'application/json' };
});

Given('the request body for verify-valid-us-address test is', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for verify-valid-us-address', async function (this: CustomWorld) {
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

Then('the response status code should be 200 for verify-valid-us-address test', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response for verify-valid-us-address test should indicate the address is {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validatedAddress in the response matches the request data for verify-valid-us-address test', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  const inputAddress = this.requestBody;
  expect(responseBody.validatedAddress.city.toUpperCase()).to.equal(inputAddress.city.toUpperCase());
  expect(responseBody.validatedAddress.country).to.equal(inputAddress.country);
  expect(responseBody.validatedAddress.postalCode).to.equal(inputAddress.postalCode);
  expect(responseBody.validatedAddress.stateOrProvince).to.equal(inputAddress.stateOrProvince);
  expect(responseBody.validatedAddress.streets).to.deep.equal(inputAddress.streets);
});