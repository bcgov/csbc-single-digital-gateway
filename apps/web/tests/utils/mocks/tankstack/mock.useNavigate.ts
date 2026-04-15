/**
 * This file mocks the `useNavigate` hook from the TanStack React Router library for testing purposes.
 * It uses Jest to create a mock function that can be used in tests to verify that `useNavigate` is called with the correct arguments.
 */
import { useNavigate } from "@tanstack/react-router";

jest.mock("@tanstack/react-router", () => ({
  useNavigate: jest.fn(),
}));

export const mockedUseNavigate = useNavigate as jest.Mock;
