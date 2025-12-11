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

Given('the API endpoint for address-with-missing-state-returns-corrected test is {string}', function (this: CustomWorld, endpoint: string) {
  this.baseUrl = 'https://avs.scff.stg.chewy.com';
  this.endpoint = endpoint;
  this.headers = {
    'Content-Type': 'application/json',
  };
});

Given('the request body for address-with-missing-state-returns-corrected is prepared with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  this.requestBody = {
    streets: [addressData.streets],
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    postalCode: addressData.postalCode,
    country: addressData.country,
  };
});

Given('the request body for address-with-missing-state-returns-corrected with unit is prepared with the following details', function (this: CustomWorld, dataTable) {
  const rows = dataTable.hashes();
  const addressData = rows[0];
  const streets = [addressData.street1];
  if (addressData.street2) {
    streets.push(addressData.street2);
  }
  this.requestBody = {
    streets: streets,
    city: addressData.city,
    stateOrProvince: addressData.stateOrProvince,
    postalCode: addressData.postalCode,
    country: addressData.country,
  };
});

When('I send a POST request for address-with-missing-state-returns-corrected to the address verification service', async function (this: CustomWorld) {
  const verbose = process.env.VERBOSE === 'true';
  
  // Log request for reports (only in verbose mode)
  if (verbose) {
    console.log('\n📤 REQUEST:');
    console.log(`POST ${this.baseUrl}${this.endpoint}`);
    console.log('Request Body:', JSON.stringify(this.requestBody, null, 2));
  }
  
  try {
    const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
    this.response = response;
    
    // Log response for reports (only in verbose mode)
    if (verbose) {
      console.log('\n📥 RESPONSE:');
      console.log(`Status: ${response.status}`);
      console.log('Response Body:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      this.response = error.response;
      if (verbose) {
        console.log('\n📥 RESPONSE (Error):');
        console.log(`Status: ${error.response?.status}`);
        console.log('Response Body:', JSON.stringify(error.response?.data, null, 2));
      }
    } else {
      throw error;
    }
  }
});

Then('the HTTP response status for address-with-missing-state-returns-corrected should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
});

Then('the response code for address-with-missing-state-returns-corrected should be {string}', function (this: CustomWorld, expectedCode: string) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('responseCode');
  expect(responseBody.responseCode).to.equal(expectedCode);
});

Then('the validatedAddress should be populated for address-with-missing-state-returns-corrected', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.not.be.null;
});

Then('the validatedAddress should be null for address-with-missing-state-returns-corrected', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('validatedAddress');
  expect(responseBody.validatedAddress).to.be.null;
});

Then('the requestAddressSanitized should be null for address-with-missing-state-returns-corrected', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.be.null;
});

Then('the requestAddressSanitized should be populated for address-with-missing-state-returns-corrected', function (this: CustomWorld) {
  const responseBody = this.response?.data;
  expect(responseBody).to.have.property('requestAddressSanitized');
  expect(responseBody.requestAddressSanitized).to.not.be.null;
});
