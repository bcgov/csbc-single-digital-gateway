/**
 * This file mocks the `useBcscAuth` hook from the authentication context for testing purposes.
 * It uses Jest to create a mock function that can be used in tests to verify that `useBcscAuth`
 * is called with the correct arguments and to control its return value.
 */
import { useBcscAuth } from "src/features/auth/auth.context";

jest.mock("src/features/auth/auth.context", () => ({
  useBcscAuth: jest.fn(),
}));

export const mockedUseBcscAuth = useBcscAuth as jest.Mock;
