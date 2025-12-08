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

Given('the API endpoint for create-non-b2b-user-with-valid-data test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'x-submitter-id': '10',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for create-non-b2b-user-with-valid-data is prepared with the following user details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    firstName: data.firstName,
    lastName: data.lastName,
    registerType: data.registerType
  };
});

Given('the address for create-non-b2b-user-with-valid-data is added with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody.address = {
    streets: [addressData.streets],
    city: addressData.city,
    state: addressData.state,
    postcode: addressData.postcode,
    country: addressData.country
  };
});

When('I send a POST request for create-non-b2b-user-with-valid-data', async function (this: CustomWorld) {
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

Then('the response should include a valid user ID for create-non-b2b-user-with-valid-data', function (this: CustomWorld) {
  expect(this.response?.data).to.be.a('number');
  expect(this.response?.data).to.not.be.null;
  expect(this.response?.data).to.be.greaterThan(0);
});

Then('the registerType in the response should be R for create-non-b2b-user-with-valid-data', async function (this: CustomWorld) {
  // Assuming the API returns the user details including registerType in the response body
  // This step might need to be adjusted based on actual API response structure
  const response = await axios.get(`${this.baseUrl}/v1/users/${this.response?.data}`, { headers: this.headers });
  expect(response.data.registerType).to.equal('R');
});