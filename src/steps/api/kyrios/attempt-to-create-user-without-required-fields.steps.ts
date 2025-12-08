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

Given('the API endpoint for attempt-to-create-user-without-required-fields test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
    'x-submitter-id': '10',
    'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`
  };
});

Given('the request body for attempt-to-create-user-without-required-fields is:', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const data = rows[0];
  this.requestBody = { registerType: data.registerType };
});

When('I send a POST request for attempt-to-create-user-without-required-fields to create a user without required fields', async function (this: CustomWorld) {
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

Then('the response status code should be 422 for attempt-to-create-user-without-required-fields', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(422);
});

Then('the response body should contain an error message for missing required fields for attempt-to-create-user-without-required-fields', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include('missing required fields');
});

Then('the response header "Content-Type" should be "application/json" for attempt-to-create-user-without-required-fields', function (this: CustomWorld) {
  const contentType = this.response?.headers['content-type'];
  expect(contentType).to.include('application/json');
});