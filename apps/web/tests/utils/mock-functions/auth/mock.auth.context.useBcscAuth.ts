import { useBcscAuth } from "src/features/auth/auth.context";

jest.mock("src/features/auth/auth.context", () => ({
  useBcscAuth: jest.fn(),
}));

export const mockUseBcscAuth = useBcscAuth as jest.Mock;
