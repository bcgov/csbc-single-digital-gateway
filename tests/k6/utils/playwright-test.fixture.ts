import { test as base } from '@playwright/test';

// Define the type for your custom configuration variable
export type TestOptions = {
  testClientDevUrl: string;
  testClientUsername: string;
  testClientPassword: string;
  testPlatformDevUrl: string;
  testPlatformUsername: string;
  testPlatformPassword: string;
  testPlatformWaitTime: number;
};

// Extend the base test object to include your new option
export const test = base.extend<TestOptions>({
  testClientDevUrl: ['http://localhost:3000', { option: true }],
  testClientUsername: ['citizen', { option: true }],
  testClientPassword: ['password', { option: true }],
  testPlatformDevUrl: ['http://localhost:3001', { option: true }],
  testPlatformUsername: ['admin', { option: true }],
  testPlatformPassword: ['password', { option: true }],
  testPlatformWaitTime: [60000, { option: true }],
});
