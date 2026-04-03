/**
 * Mock implementations for app-module-related tests
 */

export class MockDatabaseModule {}

export class MockHealthModule {}

/**
 * Mocks the ConfigModule.forRoot method to return a mock module and options for testing purposes.
 * @param options - The options passed to ConfigModule.forRoot, which can be asserted in tests.
 * @returns An object representing the mocked ConfigModule with the provided options.
 */
export const mockConfigForRoot = jest.fn((options: unknown) => ({
  module: class MockConfigModule {},
  options,
  __dynamicType: 'config',
}));

/**
 * Mocks the LoggerModule.forRootAsync method to return a mock module and options for testing purposes.
 * @param options - The options passed to LoggerModule.forRootAsync, which can be asserted in tests.
 * @returns An object representing the mocked LoggerModule with the provided options.
 */
export const mockLoggerForRootAsync = jest.fn((options: unknown) => ({
  module: class MockLoggerModule {},
  options,
  __dynamicType: 'logger',
}));
