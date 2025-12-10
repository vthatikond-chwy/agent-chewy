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

Given('the API endpoint for validate-and-correct-wrong-state-in-address test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for validate-and-correct-wrong-state-in-address is:', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for validate-and-correct-wrong-state-in-address', async function (this: CustomWorld) {
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

Then('the response status for validate-and-correct-wrong-state-in-address should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for validate-and-correct-wrong-state-in-address should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the stateProvinceChanged field for validate-and-correct-wrong-state-in-address should be true', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.stateProvinceChanged).to.be.true;
});

Then('the validatedAddress should not be null for validate-and-correct-wrong-state-in-address', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.validatedAddress).to.not.be.null;
});

Then('the requestAddressSanitized should be null for validate-and-correct-wrong-state-in-address', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody.requestAddressSanitized).to.be.null;
});