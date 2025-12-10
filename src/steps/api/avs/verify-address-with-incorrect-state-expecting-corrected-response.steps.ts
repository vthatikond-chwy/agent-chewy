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

Given('the API endpoint for verify-address-with-incorrect-state-expecting-corrected-response test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for verify-address-with-incorrect-state-expecting-corrected-response is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    streets: [addressData.streets],
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    postalCode: addressData.postalCode,
    country: addressData.country
  };
});

When('I send a POST request for verify-address-with-incorrect-state-expecting-corrected-response', async function (this: CustomWorld) {
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

Then('the response status for verify-address-with-incorrect-state-expecting-corrected-response should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for verify-address-with-incorrect-state-expecting-corrected-response should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the stateProvinceChanged field for verify-address-with-incorrect-state-expecting-corrected-response should be true', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('stateProvinceChanged');
  expect(responseBody.stateProvinceChanged).to.be.true;
});

Then('the validatedAddress should not be null for verify-address-with-incorrect-state-expecting-corrected-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.validatedAddress).to.not.be.null;
});

Then('the requestAddressSanitized should be null for verify-address-with-incorrect-state-expecting-corrected-response', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.requestAddressSanitized).to.be.null;
});