import { Given, When, Then, World } from '@cucumber/cucumber';
import axios, { type AxiosResponse } from 'axios';
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

Given('the request body for attempt-to-create-user-without-required-fields does not include "firstName", "lastName", and "fullName"', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  if (rows && rows.length > 0) {
    const data = rows[0];
    this.requestBody = {
      registerType: data.registerType
    };
  } else {
    this.requestBody = {};
  }
});

When('I send a POST request for attempt-to-create-user-without-required-fields', async function (this: CustomWorld) {
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

Then('the response code for attempt-to-create-user-without-required-fields should be 400', function (this: CustomWorld) {
  expect(this.response?.status).to.equal(400);
});

Then('the error message for attempt-to-create-user-without-required-fields indicates missing required fields', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('message');
  expect(responseBody.message).to.include('missing required fields');
});