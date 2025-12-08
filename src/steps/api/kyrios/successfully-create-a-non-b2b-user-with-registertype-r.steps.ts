import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

interface CustomWorld extends World {
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestBody?: any;
  response?: AxiosResponse<any>;
}

Given('the API endpoint for successfully-create-a-non-b2b-user-with-registertype-r test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'x-submitter-id': '10',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for successfully-create-a-non-b2b-user-with-registertype-r is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullName,
    registerType: data.registerType
  };
});

When('I send a POST request for successfully-create-a-non-b2b-user-with-registertype-r', async function (this: CustomWorld) {
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

Then('the response status code should be 200 for successfully-create-a-non-b2b-user-with-registertype-r', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(200);
});

Then('the response should contain a valid integer ID for successfully-create-a-non-b2b-user-with-registertype-r', function (this: CustomWorld) {
  expect(this.response?.data).to.be.a('number');
  expect(this.response?.data).to.be.greaterThan(0);
});

Then('the response header "Content-Type" should be "application/json" for successfully-create-a-non-b2b-user-with-registertype-r', function (this: CustomWorld) {
  expect(this.response?.headers['content-type']).to.include('application/json');
});