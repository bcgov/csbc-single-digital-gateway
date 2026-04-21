import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

import { DocumentsFilterBar } from "src/features/admin/consent-documents/components/documents-filter-bar.component";

describe("DocumentsFilterBar", () => {
  afterEach(cleanup);

  it("Should render label and input with current value", () => {
    render(<DocumentsFilterBar orgUnitId="org-1" onOrgUnitIdChange={jest.fn()} />);
    expect(screen.getByText("Org Unit ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter by org unit…")).toHaveValue("org-1");
  });

  it("Should call onOrgUnitIdChange on input change", () => {
    const onChange = jest.fn();
    render(<DocumentsFilterBar orgUnitId="" onOrgUnitIdChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Filter by org unit…"), { target: { value: "new-org" } });
    expect(onChange).toHaveBeenCalledWith("new-org");
  });
});
