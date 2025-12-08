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

Given('the API endpoint for create-non-b2b-user-without-required-fields test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'x-submitter-id': '10',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for create-non-b2b-user-without-required-fields is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = {
    registerType: data.registerType
  };
});

When('I send a POST request for create-non-b2b-user-without-required-fields', async function (this: CustomWorld) {
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

Then('the response status for create-non-b2b-user-without-required-fields should be 400', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(400);
});

Then('the response for create-non-b2b-user-without-required-fields should include a message indicating missing required fields', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include('missing required fields');
});