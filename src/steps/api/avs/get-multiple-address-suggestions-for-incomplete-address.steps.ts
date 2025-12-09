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

Given('the API endpoint for get-multiple-address-suggestions-for-incomplete-address test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for get-multiple-address-suggestions-for-incomplete-address is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    country: data.country
  };
});

When('I send a POST request for get-multiple-address-suggestions-for-incomplete-address', async function (this: CustomWorld) {
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

Then('the response status for get-multiple-address-suggestions-for-incomplete-address should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response should contain multiple address suggestions for get-multiple-address-suggestions-for-incomplete-address', function (this: CustomWorld) {
  expect(this.response?.data).to.be.an('array').that.is.not.empty;
});

Then('each suggestion should include a postal code for get-multiple-address-suggestions-for-incomplete-address', function (this: CustomWorld) {
  this.response?.data.forEach((item: any) => {
    expect(item.validatedAddress.postalCode).to.exist;
  });
});