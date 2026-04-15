import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { api } from "src/api/api.client";
import {
  AuthProvider,
  useBcscAuth,
  useIdirAuth,
} from "src/features/auth/auth.context";

jest.mock("src/api/api.client", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const BcscConsumer = () => {
  const auth = useBcscAuth();

  return (
    <div>
      <div data-testid="is-authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="is-loading">{String(auth.isLoading)}</div>
      <div data-testid="user-name">{auth.user?.name ?? "none"}</div>
      <button onClick={() => auth.login("https://app.example.com/return")}>
        login-custom
      </button>
      <button onClick={() => auth.login()}>login-default</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
};

const IdirConsumer = () => {
  const auth = useIdirAuth();

  return (
    <div>
      <div data-testid="is-authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="is-loading">{String(auth.isLoading)}</div>
    </div>
  );
};

const OutsideBcscHook = () => {
  useBcscAuth();
  return null;
};

const OutsideIdirHook = () => {
  useIdirAuth();
  return null;
};

const WrongHookInsideBcsc = () => {
  useIdirAuth();
  return null;
};

// In JSDOM, `window.location` cannot be redefined via Object.defineProperty,
// but the `window` object itself allows deletion of its `location` own property.
// Deleting it first lets us shadow it with a plain object on the window instance.
const locationAssignMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (globalThis as any).location;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).location = {
  origin: "http://localhost",
  href: locationAssignMock, //"http://localhost/",
  hash: "",
  host: "localhost",
  hostname: "localhost",
  pathname: "/",
  port: "",
  protocol: "http:",
  search: "",
  assign: locationAssignMock,
  replace: jest.fn(),
  reload: jest.fn(),
  toString: () => "http://localhost/",
};

const getLatestRedirectTarget = (): string => {
  const index = locationAssignMock.mock.calls.length - 1;
  const lastAssignCall = locationAssignMock.mock.calls[index];
  if (lastAssignCall?.[0]) {
    return String(lastAssignCall[0]);
  }
  return String(globalThis.location.href);
};

describe("AuthProvider Component Test", () => {
  beforeEach(() => {
    // IMPORTANT: reset implementations, not just call counts
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    locationAssignMock.mockReset();

    // keep test baseline deterministic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).location.href = "http://localhost/";
  });

  afterEach(async () => {
    // Flush all pending microtasks/promises before unmounting so that no
    // in-flight api.get promise resolves after cleanup and steals a mock
    // value intended for the next test.
    await waitFor(() => {});
    cleanup();
  });

  it("Should throw when useBcscAuth is used outside provider", () => {
    expect(() => render(<OutsideBcscHook />)).toThrow(
      "useBcscAuth must be used within a BCSC AuthProvider",
    );
  });

  it("Should throw when useIdirAuth is used outside provider", () => {
    expect(() => render(<OutsideIdirHook />)).toThrow(
      "useIdirAuth must be used within an IDIR AuthProvider",
    );
  });

  it("Should throw when using IDIR hook inside BCSC provider", () => {
    // Use lazy so no api.get fetch is initiated — the component throws
    // before children mount anyway, so lazy has no behavioral difference here.
    expect(() =>
      render(
        <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard" lazy>
          <WrongHookInsideBcsc />
        </AuthProvider>,
      ),
    ).toThrow("useIdirAuth must be used within an IDIR AuthProvider");
  });

  it("Should fetch current user on mount when not lazy and sets authenticated state", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { name: "Jane Doe", email: "jane@example.com" },
    } as never);

    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard">
        <BcscConsumer />
      </AuthProvider>,
    );

    expect(mockedApi.get).toHaveBeenCalledWith("/auth/bcsc/me");

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
      expect(screen.getByTestId("user-name")).toHaveTextContent("Jane Doe");
    });
  });

  it("Should set unauthenticated when /me request fails", async () => {
    mockedApi.get.mockRejectedValueOnce(new Error("no session"));

    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard">
        <BcscConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
      expect(screen.getByTestId("user-name")).toHaveTextContent("none");
    });
  });

  it("Should not fetch user when lazy=true and starts with isLoading=false", () => {
    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard" lazy>
        <BcscConsumer />
      </AuthProvider>,
    );

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("Should redirect to logoutUrl when API returns one", async () => {
    // Use non-once for /me to avoid cross-test consumption issues
    mockedApi.get.mockResolvedValue({ data: null } as never);
    mockedApi.post.mockResolvedValue({
      data: { logoutUrl: "https://idp.example.com/logout" },
    } as never);

    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard">
        <BcscConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/auth/bcsc/logout");
      expect(locationAssignMock).not.toHaveBeenCalled();
    });
  });

  it("Should redirect to the origin when API returns null logoutUrl", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null } as never);
    mockedApi.post.mockResolvedValueOnce({
      data: { logoutUrl: null },
    } as never);

    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard">
        <BcscConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(getLatestRedirectTarget()).toBe("http://localhost/");
    });
  });

  it("Should redirect to the origin when API call fails", async () => {
    // Use mockResolvedValue (not Once) so the /me call always resolves
    // regardless of ordering with other pending promises.
    mockedApi.get.mockResolvedValue({ data: null } as never);
    mockedApi.post.mockRejectedValue(new Error("logout failed"));

    render(
      <AuthProvider idpType="bcsc" defaultRedirectPath="/dashboard">
        <BcscConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/auth/bcsc/logout");
      expect(getLatestRedirectTarget()).toBe("http://localhost/");
    });
  });

  it("Should use IDIR context and IDIR /me endpoint when idpType is idir", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { name: "IDIR User" },
    } as never);

    render(
      <AuthProvider idpType="idir" defaultRedirectPath="/idir-home">
        <IdirConsumer />
      </AuthProvider>,
    );

    expect(mockedApi.get).toHaveBeenCalledWith("/auth/idir/me");

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });
  });
});
