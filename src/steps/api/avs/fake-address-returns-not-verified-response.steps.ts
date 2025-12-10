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

Given('the API endpoint for fake-address-returns-not-verified-response test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for fake-address-returns-not-verified-response is prepared with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    streets: [addressData.streets],
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    postalCode: addressData.postalCode,
    country: addressData.country,
  };
});

When('I send a POST request for fake-address-returns-not-verified-response to the address verification service', async function (this: CustomWorld) {
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

Then('the HTTP response status for fake-address-returns-not-verified-response should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
});

Then('the response code for fake-address-returns-not-verified-response should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validatedAddress should be populated for fake-address-returns-not-verified-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.not.be.null;
});

Then('the validatedAddress should be null for fake-address-returns-not-verified-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.be.null;
});

Then('the requestAddressSanitized should be null for fake-address-returns-not-verified-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.be.null;
});

Then('the requestAddressSanitized should be populated for fake-address-returns-not-verified-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.not.be.null;
});
