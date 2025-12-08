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

Given('the API endpoint for verify-address-with-invalid-country-code test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for verify-address-with-invalid-country-code is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    addressType: addressData.addressType,
    city: addressData.city,
    country: addressData.country,
    postalCode: addressData.postalCode,
    stateOrProvince: addressData.stateOrProvince,
    streets: [addressData.streets]
  };
});

When('I send a POST request for verify-address-with-invalid-country-code', async function (this: CustomWorld) {
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

Then('the response status for verify-address-with-invalid-country-code should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for verify-address-with-invalid-country-code should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});