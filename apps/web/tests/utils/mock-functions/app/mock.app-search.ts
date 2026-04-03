import { useAppSearch } from "src/features/app/components/app-search/app-search.context";

jest.mock("src/features/app/components/app-search/app-search.context", () => ({
  useAppSearch: jest.fn(),
}));

export const mockUseAppSearch = useAppSearch as jest.Mock;
