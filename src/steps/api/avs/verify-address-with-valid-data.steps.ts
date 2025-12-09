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

Given('the API endpoint for verify-address-with-valid-data test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for verify-address-with-valid-data is:', function (this: CustomWorld, dataTable) {
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

When('I send a POST request for verify-address-with-valid-data', async function (this: CustomWorld) {
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

Then('the response status for verify-address-with-valid-data should be 200', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response code for verify-address-with-valid-data should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseCode = this.response?.data.responseCode;
  expect(responseCode).to.equal(expectedCode);
});

Then('the validatedAddress matches requestAddress for verify-address-with-valid-data', function (this: CustomWorld) {
  const validatedAddress = this.response?.data.validatedAddress;
  const requestAddress = this.requestBody;
  expect(validatedAddress.streets[0].toUpperCase()).to.equal(requestAddress.streets[0].toUpperCase());
  expect(validatedAddress.city.toUpperCase()).to.equal(requestAddress.city.toUpperCase());
  expect(validatedAddress.stateOrProvince.toUpperCase()).to.equal(requestAddress.stateOrProvince.toUpperCase());
  expect(validatedAddress.postalCode).to.include(requestAddress.postalCode);
  expect(validatedAddress.country.toUpperCase()).to.equal(requestAddress.country.toUpperCase());
});