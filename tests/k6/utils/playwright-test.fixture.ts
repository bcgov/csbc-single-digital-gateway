import { test as base } from '@playwright/test';

// Define the type for your custom configuration variable
export type TestOptions = {
  testClientDevUrl: string;
  testClientUsername: string;
  testClientPassword: string;
};

// Extend the base test object to include your new option
export const test = base.extend<TestOptions>({
  testClientDevUrl: ['http://localhost:3000', { option: true }],
  testClientUsername: ['citizen1', { option: true }],
  testClientPassword: ['password', { option: true }],
});
