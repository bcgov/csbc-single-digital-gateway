import { render, screen } from "@testing-library/react";
import { NavigationBar } from "../../navigation-bar";
import { PublicNavigationBar } from "../../public-layout/public-navigation-bar.component";

jest.mock("../../navigation-bar", () => ({
  NavigationBar: jest.fn(() => <div data-testid="navigation-bar" />),
}));

jest.mock("src/features/auth/components/sign-in.component", () => ({
  SignIn: () => <div data-testid="sign-in" />,
}));

describe("PublicNavigationBar Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should render NavigationBar", () => {
    render(<PublicNavigationBar />);

    expect(screen.getByTestId("navigation-bar")).toBeInTheDocument();
    expect(NavigationBar).toHaveBeenCalledTimes(1);
  });

  it("Should pass expected title and SignIn as extras", () => {
    render(<PublicNavigationBar />);

    const navigationBarMock = NavigationBar as jest.Mock;
    const props = navigationBarMock.mock.calls[0][0];

    expect(props.title).toBe("Single Digital Gateway");
    expect(props.extras).toBeTruthy();

    render(<>{props.extras}</>);
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
  });
});
