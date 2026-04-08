/**
 * This file mocks the `useAppSearch` hook from the app search context for testing purposes.
 * It uses Jest to create a mock function that can be used in tests to verify that `useAppSearch`
 * is called with the correct arguments and to control its return value.
 */
import { useAppSearch } from "src/features/app/components/app-search/app-search.context";

jest.mock("src/features/app/components/app-search/app-search.context", () => ({
  useAppSearch: jest.fn(),
}));

export const mockedUseAppSearch = useAppSearch as jest.Mock;
