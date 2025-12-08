import { Given, Then, World } from '@cucumber/cucumber';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';
import { saveSuccessfulPattern } from '../../../agents/api-agent/self-healing.js';

interface CustomWorld extends World {
  response?: AxiosResponse;
  baseUrl?: string;
  endpoint?: string;
  requestBody?: any;
}

Then('the response status code should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.response?.status).to.equal(expectedStatus);
  
  // Self-healing: Save successful request pattern (status 200-299)
  if (this.response && this.response.status >= 200 && this.response.status < 300 && this.endpoint && this.requestBody) {
    try {
      // Extract method from step context if available, or default to POST
      const method = (this as any).httpMethod || 'POST';
      saveSuccessfulPattern({
        endpoint: this.endpoint,
        method: method,
        requestBody: this.requestBody,
        responseBody: this.response.data,
        statusCode: this.response.status,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silently fail - healing is optional
    }
  }
});

Given('I am authorized to access the {string} endpoint', function (this: CustomWorld, endpoint: string) {
  // Authorization setup - can be customized based on authentication requirements
  // For now, this is a placeholder that can be extended
});

