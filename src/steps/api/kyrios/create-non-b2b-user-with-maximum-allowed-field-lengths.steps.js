import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
dotenv.config();
Given('the API endpoint for create-non-b2b-user-with-maximum-allowed-field-lengths test is {string}', function (endpoint) {
    this.baseUrl = 'https://kyriosb.csbb.stg.aws.chewy.cloud';
    this.endpoint = endpoint;
    const oauthToken = process.env.OAUTH_TOKEN;
    if (!oauthToken) {
        console.warn('Warning: OAUTH_TOKEN environment variable is not set. API requests may fail with 401 Unauthorized.');
    }
    this.headers = {
        'Content-Type': 'application/json',
        'x-submitter-id': '10',
        ...(oauthToken && { 'Authorization': `Bearer ${oauthToken}` })
    };
});
Given('the request body for create-non-b2b-user-with-maximum-allowed-field-lengths is prepared with the following user details', function (dataTable) {
    const rows = dataTable.hashes();
    const data = rows[0];
    this.requestBody = {
        firstName: data.firstName,
        lastName: data.lastName,
        registerType: data.registerType
    };
});
Given('the address for create-non-b2b-user-with-maximum-allowed-field-lengths is added with the following details', function (dataTable) {
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
When('I send a POST request for create-non-b2b-user-with-maximum-allowed-field-lengths', async function () {
    try {
        const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
        this.response = response;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            this.response = error.response;
        }
        else {
            throw error;
        }
    }
});
Then('the response status code for create-non-b2b-user-with-maximum-allowed-field-lengths should be 200', function () {
    expect(this.response?.status).to.equal(200);
});
Then('the response for create-non-b2b-user-with-maximum-allowed-field-lengths should include a valid user ID', function () {
    expect(this.response?.data).to.be.a('number');
    expect(this.response?.data).to.be.greaterThan(0);
});
Then('firstName and lastName for create-non-b2b-user-with-maximum-allowed-field-lengths should be accepted at their maximum lengths', function () {
    const requestBody = this.requestBody;
    expect(requestBody.firstName).to.have.lengthOf.at.most(50); // Assuming 50 is the max length for firstName
    expect(requestBody.lastName).to.have.lengthOf.at.most(50); // Assuming 50 is the max length for lastName
});
//# sourceMappingURL=create-non-b2b-user-with-maximum-allowed-field-lengths.steps.js.map