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

Given('the API endpoint for validate-empty-postal-code-and-expect-corrections test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for validate-empty-postal-code-and-expect-corrections is:', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for validate-empty-postal-code-and-expect-corrections', async function (this: CustomWorld) {
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

Then('the response status for validate-empty-postal-code-and-expect-corrections should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for validate-empty-postal-code-and-expect-corrections should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseCode = this.response?.data.responseCode;
  expect(responseCode).to.equal(expectedCode);
});

Then('the postalChanged field for validate-empty-postal-code-and-expect-corrections should be true', function (this: CustomWorld) {
  const postalChanged = this.response?.data.postalChanged;
  expect(postalChanged).to.be.true;
});

Then('the validatedAddress should be populated for validate-empty-postal-code-and-expect-corrections', function (this: CustomWorld) {
  const validatedAddress = this.response?.data.validatedAddress;
  expect(validatedAddress).to.not.be.empty;
});

Then('the requestAddressSanitized should be null for validate-empty-postal-code-and-expect-corrections', function (this: CustomWorld) {
  const requestAddressSanitized = this.response?.data.requestAddressSanitized;
  expect(requestAddressSanitized).to.be.null;
});