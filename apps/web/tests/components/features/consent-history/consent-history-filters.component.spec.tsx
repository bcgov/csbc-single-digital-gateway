import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { fireEvent, render, screen } from "@testing-library/react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import { ConsentHistoryFilters } from "src/features/consent-history/components/consent-history-filters.component";
import { documentTypesQueryOptions } from "src/features/consent-history/data/document-types.query";

type ChildrenProps = {
  children?: ReactNode;
};

type AccordionGroupProps = ChildrenProps & {
  title: string;
};

type CheckboxProps = {
  id: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & ChildrenProps;

jest.mock("src/features/consent-history/data/document-types.query", () => ({
  documentTypesQueryOptions: jest.fn(() => ({
    queryKey: ["document-types"],
  })),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("@tanstack/react-router", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("@repo/ui", () => ({
  AccordionGroup: ({ title, children }: AccordionGroupProps) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  AccordionItem: ({ children }: ChildrenProps) => <div>{children}</div>,
  AccordionTrigger: ({ children }: ChildrenProps) => (
    <button type="button">{children}</button>
  ),
  AccordionContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  Checkbox: ({ id, checked = false, onCheckedChange }: CheckboxProps) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.(!checked)}
    />
  ),
  Input: (props: InputProps) => <input {...props} />,
  Label: ({ children, ...props }: LabelProps) => (
    <label {...props}>{children}</label>
  ),
}));

const mockDocumentTypesQueryOptions = documentTypesQueryOptions as jest.Mock;
const mockNavigate = jest.fn();
const mockUseQuery = useQuery as jest.Mock;
const mockUseNavigate = useNavigate as jest.Mock;

const getLatestNavigateCall = () => {
  const index = mockNavigate.mock.calls.length - 1;
  const call = mockNavigate.mock.calls[index]?.[0];

  expect(call).toBeDefined();

  return call as {
    replace: boolean;
    search: (prev: Record<string, unknown>) => Record<string, unknown>;
  };
};

describe("ConsentHistoryFilters Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseQuery.mockReturnValue({
      data: [
        { id: "terms", name: "Terms of Service" },
        { id: "privacy", name: "Privacy Policy" },
      ],
    });
  });

  it("Should render filters, selected values, and query-backed document types", () => {
    render(
      <ConsentHistoryFilters
        documentType={["privacy"]}
        status={["granted"]}
        from="2024-01-01"
        to="2024-01-31"
      />,
    );

    expect(mockUseNavigate).toHaveBeenCalledWith({
      from: "/app/settings/consent-history",
    });
    expect(mockDocumentTypesQueryOptions).toHaveBeenCalled();

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Consent type" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument();

    expect(screen.getByLabelText("Terms of Service")).not.toBeChecked();
    expect(screen.getByLabelText("Privacy Policy")).toBeChecked();
    expect(screen.getByLabelText("Granted")).toBeChecked();
    expect(screen.getByLabelText("Revoked")).not.toBeChecked();

    expect(screen.getByLabelText("From")).toHaveValue("2024-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2024-01-31");
  });

  it("Should render an empty message when no document types are available", () => {
    mockUseQuery.mockReturnValue({
      data: [],
    });

    render(<ConsentHistoryFilters />);

    expect(
      screen.getByText("No document types available."),
    ).toBeInTheDocument();
  });

  it("Should add a document type filter and clear the page search param", () => {
    render(
      <ConsentHistoryFilters documentType={["terms"]} status={["granted"]} />,
    );

    fireEvent.click(screen.getByLabelText("Privacy Policy"));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    const navigateCall = getLatestNavigateCall();
    expect(navigateCall.replace).toBe(true);

    const nextSearch = navigateCall.search({
      status: ["granted"],
      page: 4,
      sort: "desc",
    });

    expect(nextSearch).toEqual({
      status: ["granted"],
      page: undefined,
      sort: "desc",
      documentType: ["terms", "privacy"],
    });
  });

  it("Should remove the last selected status filter and clear the page search param", () => {
    render(<ConsentHistoryFilters status={["granted"]} />);

    fireEvent.click(screen.getByLabelText("Granted"));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    const navigateCall = getLatestNavigateCall();
    expect(navigateCall.replace).toBe(true);

    const nextSearch = navigateCall.search({
      documentType: ["terms"],
      status: ["granted"],
      page: 2,
      keyword: "abc",
    });

    expect(nextSearch).toEqual({
      documentType: ["terms"],
      status: undefined,
      page: undefined,
      keyword: "abc",
    });
  });

  it("Should update the from date and clear the page search param", () => {
    render(<ConsentHistoryFilters from="2024-01-01" />);

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2024-02-01" },
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    const navigateCall = getLatestNavigateCall();
    expect(navigateCall.replace).toBe(true);

    const nextSearch = navigateCall.search({
      status: ["revoked"],
      page: 7,
      sort: "asc",
    });

    expect(nextSearch).toEqual({
      status: ["revoked"],
      page: undefined,
      sort: "asc",
      from: "2024-02-01",
    });
  });

  it("Should clear the to date when the input is emptied", () => {
    render(<ConsentHistoryFilters to="2024-01-31" />);

    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "" },
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    const navigateCall = getLatestNavigateCall();
    expect(navigateCall.replace).toBe(true);

    const nextSearch = navigateCall.search({
      documentType: ["privacy"],
      to: "2024-01-31",
      page: 9,
    });

    expect(nextSearch).toEqual({
      documentType: ["privacy"],
      to: undefined,
      page: undefined,
    });
  });
});
