import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

interface CustomWorld extends World {
  baseUrl: string;
  endpoint: string;
  headers: Record<string, string>;
  requestBody: any;
  response?: AxiosResponse;
}

Given('the API endpoint for ensure-missing-required-fields-return-errors test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for ensure-missing-required-fields-return-errors does not include "streets" field', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    city: addressData.city,
    country: addressData.country,
    postalCode: addressData.postalCode,
    stateOrProvince: addressData.stateOrProvince,
    // streets field is intentionally omitted to trigger the error
  };
});

When('I send a POST request for ensure-missing-required-fields-return-errors', async function (this: CustomWorld) {
  try {
    const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
    this.response = response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      this.response = error.response;
    } else {
      throw error; // Rethrow if it's not an AxiosError with a response
    }
  }
});

Then('the response status code should be 400 for ensure-missing-required-fields-return-errors', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(400);
});

Then('the response contains error message about missing "streets" field for ensure-missing-required-fields-return-errors', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include('streets');
});