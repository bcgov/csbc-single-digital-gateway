import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockedUseBcscAuth } from "tests/utils/mocks/auth/mock.useBcscAuth";
import { mockedUseNavigate } from "tests/utils/mocks/tankstack/mock.useNavigate";
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

    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseBcscAuth.mockReturnValue({
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

    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseBcscAuth.mockReturnValue({
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
