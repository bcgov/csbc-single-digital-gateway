import { useNavigate } from "@tanstack/react-router";

jest.mock("@tanstack/react-router", () => ({
  useNavigate: jest.fn(),
}));

export const mockUseNavigate = useNavigate as jest.Mock;
