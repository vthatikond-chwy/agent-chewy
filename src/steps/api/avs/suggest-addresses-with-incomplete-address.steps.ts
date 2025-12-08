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

Given('the API endpoint for suggest-addresses-with-incomplete-address test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for suggest-addresses-with-incomplete-address is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    streets: [addressData.streets],
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    country: addressData.country,
  };
});

When('I send a POST request for suggest-addresses-with-incomplete-address', async function (this: CustomWorld) {
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

Then('the response status for suggest-addresses-with-incomplete-address should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response for suggest-addresses-with-incomplete-address should be an array', function (this: CustomWorld) {
  expect(this.response?.data).to.be.an('array');
});

Then('each item in the response array for suggest-addresses-with-incomplete-address should have:', function (this: CustomWorld, dataTable) {
  const expectedFields = dataTable.rawTable.map(row => row[0]);
  this.response?.data.forEach((item: any) => {
    expect(item).to.have.property('requestAddress');
    const requestAddress = item.requestAddress;
    expectedFields.forEach((field) => {
      expect(requestAddress).to.have.property(field);
    });
  });
});