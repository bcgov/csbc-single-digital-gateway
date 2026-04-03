import { useNavigate } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockUseBcscAuth } from "tests/utils/mock-functions/auth/mock.auth.context.useBcscAuth";
import { SignIn } from "../../components/sign-in.component";

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconArrowRight: () => <svg data-testid="icon-arrow-right" />,
  IconLogin2: () => <svg data-testid="icon-login-2" />,
}));

jest.mock("@tanstack/react-router", () => ({
  useNavigate: jest.fn(),
}));

const mockUseNavigate = useNavigate as jest.Mock;

describe("SignIn Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render Sign In and call login when unauthenticated", async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const login = jest.fn();

    mockUseNavigate.mockReturnValue(navigate);
    mockUseBcscAuth.mockReturnValue({
      isAuthenticated: false,
      login,
    });

    render(<SignIn />);

    expect(
      screen.getByRole("button", { name: /Sign In/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Go to App/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(login).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("Should render Go to App and navigate to /app when authenticated", async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const login = jest.fn();

    mockUseNavigate.mockReturnValue(navigate);
    mockUseBcscAuth.mockReturnValue({
      isAuthenticated: true,
      login,
    });

    render(<SignIn />);

    expect(
      screen.getByRole("button", { name: /Go to App/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Sign In/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Go to App/i }));

    expect(navigate).toHaveBeenCalledWith({ to: "/app" });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(login).not.toHaveBeenCalled();
  });
});
