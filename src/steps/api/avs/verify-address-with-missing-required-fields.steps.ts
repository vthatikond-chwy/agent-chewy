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

Given('the API endpoint for verify-address-with-missing-required-fields test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for verify-address-with-missing-required-fields is:', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for verify-address-with-missing-required-fields', async function (this: CustomWorld) {
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

Then('the response status for verify-address-with-missing-required-fields should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for verify-address-with-missing-required-fields should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validatedAddress should be null for verify-address-with-missing-required-fields', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.validatedAddress).to.be.null;
});

Then('the requestAddressSanitized should be populated for verify-address-with-missing-required-fields', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.requestAddress).to.not.be.null;
});

Then('the postalChanged field for verify-address-with-missing-required-fields should be false', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.postalChanged).to.be.false;
});

Then('the cityChanged field for verify-address-with-missing-required-fields should be false', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.cityChanged).to.be.false;
});

Then('the stateProvinceChanged field for verify-address-with-missing-required-fields should be false', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.stateProvinceChanged).to.be.false;
});

Then('the streetChanged field for verify-address-with-missing-required-fields should be false', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.streetChanged).to.be.false;
});