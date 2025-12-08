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

Given('the API endpoint for create-non-b2b-user-with-unsupported-registertype test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'x-submitter-id': '10',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for create-non-b2b-user-with-unsupported-registertype is prepared with the following user details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    firstName: data.firstName,
    lastName: data.lastName,
    registerType: data.registerType
  };
});

Given('the address for create-non-b2b-user-with-unsupported-registertype is added with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  if (!this.requestBody) this.requestBody = {};
  this.requestBody.address = {
    streets: [addressData.streets],
    city: addressData.city,
    state: addressData.state,
    postcode: addressData.postcode,
    country: addressData.country
  };
});

When('I send a POST request for create-non-b2b-user-with-unsupported-registertype', async function (this: CustomWorld) {
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

Then('the response status for create-non-b2b-user-with-unsupported-registertype should be {int}', function (this: CustomWorld, expectedStatusCode: number) {
  expect(this.response?.status).to.equal(expectedStatusCode);
});

Then('the response for create-non-b2b-user-with-unsupported-registertype should include a message indicating unsupported RegisterType', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include('unsupported RegisterType');
});