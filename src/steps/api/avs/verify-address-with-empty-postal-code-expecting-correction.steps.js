import { Given, When, Then, World } from '@cucumber/cucumber';
import axios from 'axios';
import { expect } from 'chai';
import * as dotenv from 'dotenv';
dotenv.config();
Given('the API endpoint for verify-address-with-empty-postal-code-expecting-correction test is {string}', function (endpoint) {
    this.baseUrl = 'https://avs.scff.stg.chewy.com';
    this.endpoint = endpoint;
    this.headers = {
        'Content-Type': 'application/json',
    };
});
Given('the request body for verify-address-with-empty-postal-code-expecting-correction is:', function (dataTable) {
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
When('I send a POST request for verify-address-with-empty-postal-code-expecting-correction', async function () {
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
Then('the HTTP response status for verify-address-with-empty-postal-code-expecting-correction should be 200', function () {
    expect(this.response?.status).to.equal(200);
});
Then('the response code for verify-address-with-empty-postal-code-expecting-correction should be {string}', function (expectedCode) {
    const responseBody = this.response?.data;
    expect(responseBody).to.have.property('responseCode');
    expect(responseBody.responseCode).to.equal(expectedCode);
});
Then('the postalChanged field for verify-address-with-empty-postal-code-expecting-correction should be true', function () {
    const responseBody = this.response?.data;
    expect(responseBody).to.have.property('postalChanged');
    expect(responseBody.postalChanged).to.be.true;
});
Then('the validatedAddress should be populated for verify-address-with-empty-postal-code-expecting-correction', function () {
    const responseBody = this.response?.data;
    expect(responseBody).to.have.property('validatedAddress');
    expect(responseBody.validatedAddress).to.not.be.empty;
});
Then('the requestAddressSanitized should be null for verify-address-with-empty-postal-code-expecting-correction', function () {
    const responseBody = this.response?.data;
    expect(responseBody).to.have.property('requestAddressSanitized');
    expect(responseBody.requestAddressSanitized).to.be.null;
});
//# sourceMappingURL=verify-address-with-empty-postal-code-expecting-correction.steps.js.map