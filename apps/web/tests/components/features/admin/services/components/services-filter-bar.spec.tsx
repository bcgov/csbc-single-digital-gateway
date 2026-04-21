import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

import { ServicesFilterBar } from "src/features/admin/services/components/services-filter-bar.component";

describe("ServicesFilterBar", () => {
  afterEach(cleanup);

  it("Should render label and input with current value", () => {
    render(<ServicesFilterBar orgUnitId="org-1" onOrgUnitIdChange={jest.fn()} />);
    expect(screen.getByText("Org Unit ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter by org unit…")).toHaveValue("org-1");
  });

  it("Should call onOrgUnitIdChange on input change", () => {
    const onChange = jest.fn();
    render(<ServicesFilterBar orgUnitId="" onOrgUnitIdChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Filter by org unit…"), { target: { value: "new-org" } });
    expect(onChange).toHaveBeenCalledWith("new-org");
  });
});
