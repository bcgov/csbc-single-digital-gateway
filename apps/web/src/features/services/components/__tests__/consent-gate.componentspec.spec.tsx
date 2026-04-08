import "@testing-library/jest-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import { consentDocumentsQueryOptions } from "src/features/services/data/consent-document.query";
import { useCreateConsentStatements } from "src/features/services/data/consent-statement.mutation";
import { mockedUseQuery } from "tests/utils/mocks/tankstack/mock.useQuery";
import { ConsentGate } from "../consent-gate.component";

jest.mock("src/features/services/data/consent-document.query", () => ({
  consentDocumentsQueryOptions: jest.fn((documentIds: string[]) => ({
    queryKey: ["consent-documents", ...documentIds],
  })),
}));

jest.mock("src/features/services/data/consent-statement.mutation", () => ({
  useCreateConsentStatements: jest.fn(),
}));

jest.mock("../lexical-content.component", () => ({
  LexicalContent: () => (
    <div data-testid="lexical-content">Lexical content</div>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconCircleCheckFilled: ({ className }: { className?: string }) => (
    <svg data-testid="icon-circle-check-filled" className={className} />
  ),
  IconCircleXFilled: ({ className }: { className?: string }) => (
    <svg data-testid="icon-circle-x-filled" className={className} />
  ),
  IconPlayerPlay: ({ className }: { className?: string }) => (
    <svg data-testid="icon-player-play" className={className} />
  ),
}));

jest.mock("@repo/ui", () => ({
  AccordionGroup: ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  AccordionItem: ({
    children,
    ...props
  }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) => (
    <section {...props}>{children}</section>
  ),
  AccordionTrigger: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AccordionContent: ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    ...props
  }: InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      {...props}
      id={id}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Label: ({
    children,
    ...props
  }: LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) => (
    <label {...props}>{children}</label>
  ),
  Separator: (props: HTMLAttributes<HTMLHRElement>) => (
    <hr data-testid="separator" {...props} />
  ),
}));

const mockConsentDocumentsQueryOptions =
  consentDocumentsQueryOptions as jest.Mock;
const mockUseCreateConsentStatements = useCreateConsentStatements as jest.Mock;

describe("ConsentGate Component Test", () => {
  const mockMutateAsync = jest.fn();

  const documents = [
    {
      id: "doc-1",
      name: "Privacy Policy",
      content: { root: { children: [] } },
      signOff: "I agree to the Privacy Policy",
    },
    {
      id: "doc-2",
      name: "Terms of Service",
      content: null,
      signOff: "I agree to the Terms of Service",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseQuery.mockReturnValue({ data: documents });
    mockUseCreateConsentStatements.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockMutateAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("Should call onAgree immediately and render nothing when no documents are returned", () => {
    const onAgree = jest.fn();
    mockedUseQuery.mockReturnValue({ data: [] });

    const { container } = render(
      <ConsentGate onAgree={onAgree} documentIds={["doc-1", "doc-2"]} />,
    );

    expect(onAgree).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it("Should render consent documents, content state, and disabled submit button initially", () => {
    const onAgree = jest.fn();

    render(<ConsentGate onAgree={onAgree} documentIds={["doc-1", "doc-2"]} />);

    expect(mockConsentDocumentsQueryOptions).toHaveBeenCalledWith([
      "doc-1",
      "doc-2",
    ]);

    expect(
      screen.getByRole("heading", { name: /Data & privacy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /To proceed with the application, you will need to agree/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByTestId("lexical-content")).toBeInTheDocument();
    expect(screen.getByText("No content available.")).toBeInTheDocument();

    expect(
      screen.getByLabelText("I agree to the Privacy Policy"),
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("I agree to the Terms of Service"),
    ).not.toBeChecked();

    const submitButton = screen.getByRole("button", {
      name: /Start online application/i,
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId("icon-player-play")).toBeInTheDocument();
    expect(screen.getAllByTestId("icon-circle-x-filled")).toHaveLength(2);
    expect(screen.queryAllByTestId("icon-circle-check-filled")).toHaveLength(0);
  });

  it("Should enable submit only after all consent documents are accepted", () => {
    const onAgree = jest.fn();

    render(<ConsentGate onAgree={onAgree} documentIds={["doc-1", "doc-2"]} />);

    const privacyCheckbox = screen.getByLabelText(
      "I agree to the Privacy Policy",
    );
    const termsCheckbox = screen.getByLabelText(
      "I agree to the Terms of Service",
    );
    const submitButton = screen.getByRole("button", {
      name: /Start online application/i,
    });

    fireEvent.click(privacyCheckbox);

    expect(submitButton).toBeDisabled();
    expect(screen.getAllByTestId("icon-circle-check-filled")).toHaveLength(1);
    expect(screen.getAllByTestId("icon-circle-x-filled")).toHaveLength(1);

    fireEvent.click(termsCheckbox);

    expect(submitButton).toBeEnabled();
    expect(screen.getAllByTestId("icon-circle-check-filled")).toHaveLength(2);
    expect(screen.queryAllByTestId("icon-circle-x-filled")).toHaveLength(0);
  });

  it("Should submit granted consent statements and then call onAgree", async () => {
    const onAgree = jest.fn();

    render(<ConsentGate onAgree={onAgree} documentIds={["doc-1", "doc-2"]} />);

    fireEvent.click(screen.getByLabelText("I agree to the Privacy Policy"));
    fireEvent.click(screen.getByLabelText("I agree to the Terms of Service"));
    fireEvent.click(
      screen.getByRole("button", { name: /Start online application/i }),
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith([
      {
        document: documents[0],
        status: "granted",
      },
      {
        document: documents[1],
        status: "granted",
      },
    ]);

    await waitFor(() => {
      expect(onAgree).toHaveBeenCalledTimes(1);
    });
  });
});
