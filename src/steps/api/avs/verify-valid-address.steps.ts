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

Given('the API endpoint for verify-valid-address test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for verify-valid-address is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    postalCode: data.postalCode,
    country: data.country
  };
});

When('I send a POST request for verify-valid-address', async function (this: CustomWorld) {
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

Then('the response status for verify-valid-address should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for verify-valid-address should be {string}', function (this: CustomWorld, expectedCode: string) {
  const actualCode = this.response?.data.responseCode;
  expect(actualCode).to.equal(expectedCode);
});

Then('the validatedAddress for verify-valid-address should match requestAddress', function (this: CustomWorld) {
  const validatedAddress = this.response?.data.validatedAddress;
  const requestAddress = this.requestBody;

  expect(validatedAddress.city.toUpperCase()).to.equal(requestAddress.city.toUpperCase());
  expect(validatedAddress.stateOrProvince.toUpperCase()).to.equal(requestAddress.stateOrProvince.toUpperCase());
  expect(validatedAddress.country.toUpperCase()).to.equal(requestAddress.country.toUpperCase());
  expect(validatedAddress.postalCode).to.include(requestAddress.postalCode);
});