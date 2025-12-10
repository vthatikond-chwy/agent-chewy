import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
dotenv.config();
Given('the API endpoint for create-non-b2b-user-with-valid-data test is {string}', function (endpoint) {
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
Given('the request body for create-non-b2b-user-with-valid-data is prepared with the following user details', function (dataTable) {
    const rows = dataTable.hashes();
    const data = rows[0];
    this.requestBody = {
        firstName: data.firstName,
        lastName: data.lastName,
        registerType: data.registerType
    };
});
Given('the address for create-non-b2b-user-with-valid-data is added with the following details', function (dataTable) {
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
When('I send a POST request for create-non-b2b-user-with-valid-data', async function () {
    try {
        const response = await axios.post(`${this.baseUrl}${this.endpoint}`, this.requestBody, { headers: this.headers });
        this.response = response;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            this.response = error.response;
            // Log 401 errors for debugging
            if (error.response?.status === 401) {
                console.error('❌ 401 Unauthorized Error:');
                console.error('Request URL:', `${this.baseUrl}${this.endpoint}`);
                console.error('Request Headers:', JSON.stringify(this.headers, null, 2));
                console.error('Response:', JSON.stringify(error.response?.data, null, 2));
                console.error('OAuth Token present:', !!this.headers?.Authorization);
            }
        }
        else {
            throw error;
        }
    }
});
Then('the response status code should be {int} for create-non-b2b-user-with-valid-data', function (expectedStatusCode) {
    expect(this.response?.status).to.equal(expectedStatusCode);
});
Then('the response should include a valid user ID for create-non-b2b-user-with-valid-data', function () {
    expect(this.response?.data).to.be.a('number');
    expect(this.response?.data).to.not.be.null;
    expect(this.response?.data).to.be.greaterThan(0);
});
Then('the registerType in the response should be R for create-non-b2b-user-with-valid-data', async function () {
    // Assuming the API returns the user details including registerType in the response body
    // This step might need to be adjusted based on actual API response structure
    const response = await axios.get(`${this.baseUrl}/v1/users/${this.response?.data}`, { headers: this.headers });
    expect(response.data.registerType).to.equal('R');
});
//# sourceMappingURL=create-non-b2b-user-with-valid-data.steps.js.map