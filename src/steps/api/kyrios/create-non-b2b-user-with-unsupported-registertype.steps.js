import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
dotenv.config();
Given('the API endpoint for create-non-b2b-user-with-unsupported-registertype test is {string}', function (endpoint) {
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
Given('the request body for create-non-b2b-user-with-unsupported-registertype is prepared with the following user details', function (dataTable) {
    const rows = dataTable.hashes();
    const data = rows[0];
    this.requestBody = {
        firstName: data.firstName,
        lastName: data.lastName,
        registerType: data.registerType
    };
});
Given('the address for create-non-b2b-user-with-unsupported-registertype is added with the following details', function (dataTable) {
    const rows = dataTable.hashes();
    const addressData = rows[0];
    if (!this.requestBody)
        this.requestBody = {};
    this.requestBody.address = {
        streets: [addressData.streets],
        city: addressData.city,
        state: addressData.state,
        postcode: addressData.postcode,
        country: addressData.country
    };
});
When('I send a POST request for create-non-b2b-user-with-unsupported-registertype', async function () {
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
Then('the response status for create-non-b2b-user-with-unsupported-registertype should be {int}', function (expectedStatusCode) {
    expect(this.response?.status).to.equal(expectedStatusCode);
});
Then('the response for create-non-b2b-user-with-unsupported-registertype should include a message indicating unsupported RegisterType', function () {
    const responseBody = this.response?.data;
    expect(responseBody).to.have.property('message');
    expect(responseBody.message).to.include('unsupported RegisterType');
});
//# sourceMappingURL=create-non-b2b-user-with-unsupported-registertype.steps.js.map