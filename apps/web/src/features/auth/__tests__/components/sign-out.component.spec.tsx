import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockedUseBcscAuth } from "tests/utils/mocks/auth/mock.auth.context.useBcscAuth";
import { SignOut } from "../../components/sign-out.component";

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconLogout: () => <svg data-testid="icon-logout" />,
}));

describe("SignOut Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render Sign Out button with icon and danger classes", () => {
    const logout = jest.fn();
    mockedUseBcscAuth.mockReturnValue({ logout });

    render(<SignOut />);

    const button = screen.getByRole("button", { name: /Sign Out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-danger");
    expect(button).toHaveClass("hover:bg-danger/80");
    expect(screen.getByTestId("icon-logout")).toBeInTheDocument();
  });

  it("Should call logout when Sign Out button is clicked", async () => {
    const user = userEvent.setup();
    const logout = jest.fn();
    mockedUseBcscAuth.mockReturnValue({ logout });

    render(<SignOut />);

    await user.click(screen.getByRole("button", { name: /Sign Out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
