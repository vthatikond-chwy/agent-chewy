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

Given('the API endpoint for validate-response-structure-for-address-suggestion test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for validate-response-structure-for-address-suggestion is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    streets: [data.streets],
    city: data.city,
    stateOrProvince: data.stateOrProvince,
    country: data.country
  };
});

When('I send a POST request for validate-response-structure-for-address-suggestion', async function (this: CustomWorld) {
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

Then('the response status for validate-response-structure-for-address-suggestion should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('each item in the response array should contain cityChanged, postalChanged, and validatedAddress fields for validate-response-structure-for-address-suggestion', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('cityChanged');
  expect(responseBody).to.have.property('postalChanged');
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.cityChanged).to.be.a('boolean');
  expect(responseBody.postalChanged).to.be.a('boolean');
  expect(responseBody.validatedAddress).to.be.an('object');
});