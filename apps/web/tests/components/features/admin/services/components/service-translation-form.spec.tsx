import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@repo/ui", () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  // Input renders as a regular <input> — role=textbox, index 0 in getAllByRole
  Input: ({ disabled, value, onChange, required }: any) => (
    <input
      disabled={disabled}
      value={value}
      onChange={onChange}
      required={required}
    />
  ),
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  // Each Textarea renders as <textarea> — role=textbox, indices 1+ in getAllByRole
  Textarea: ({ disabled, value, onChange, rows, className }: any) => (
    <textarea
      disabled={disabled}
      value={value}
      onChange={onChange}
      rows={rows}
      className={className}
    />
  ),
}));

const mockMutate = jest.fn();
jest.mock(
  "src/features/admin/services/data/services.mutations",
  () => ({
    useUpsertServiceTranslation: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  }),
);

jest.mock("@repo/jsonforms", () => ({
  repoAjv: {},
  repoCells: [],
  repoRenderers: [],
}));

jest.mock("@jsonforms/react", () => ({
  JsonForms: ({ onChange }: any) => (
    <div
      data-testid="json-forms"
      onClick={() => onChange?.({ data: { field: "updated" } })}
    />
  ),
}));

jest.mock("src/features/admin/services/data/async-select-loaders", () => ({
  loadCategories: jest.fn(),
  resolveCategory: jest.fn(),
}));

import { toast } from "sonner";
import { ServiceTranslationForm } from "src/features/admin/services/components/service-translation-form.component";

const BASE_PROPS = {
  serviceId: "svc-123",
  versionId: "ver-456",
  locale: "en",
  isDraft: true,
};

const TRANSLATION_BASE = {
  id: "tr-111",
  serviceVersionId: "ver-456",
  createdAt: "2024-07-01T00:00:00.000Z",
  updatedAt: "2024-07-01T00:00:00.000Z",
};

// DOM field order (getAllByRole("textbox")):
//   [0] = <input>        → Name
//   [1] = <textarea>     → Description
//   [2] = <textarea>     → Content (JSON) — only present when no schema

function nameInput() {
  return screen.getAllByRole("textbox")[0];
}
function descriptionTextarea() {
  return screen.getAllByRole("textbox")[1];
}
function contentTextarea() {
  return screen.getAllByRole("textbox")[2];
}

describe("ServiceTranslationForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    (toast.error as jest.Mock).mockReset();
    (toast.success as jest.Mock).mockReset();
  });

  afterEach(cleanup);

  describe("field rendering", () => {
    it("should render Name input, Description and Content (JSON) fields", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
    });

    it("should pre-populate name input from translation prop", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "BC Services Card",
            description: "Provincial identity card",
            content: {},
          }}
        />,
      );

      expect(nameInput()).toHaveValue("BC Services Card");
    });

    it("should pre-populate description textarea from translation prop", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "BC Services Card",
            description: "Provincial identity card",
            content: {},
          }}
        />,
      );

      expect(descriptionTextarea()).toHaveValue("Provincial identity card");
    });

    it("should render the Save Translation button when isDraft is true", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      expect(
        screen.getByRole("button", { name: "Save Translation" }),
      ).toBeInTheDocument();
    });

    it("should not render the Save Translation button when isDraft is false", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(
        screen.queryByRole("button", { name: "Save Translation" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("content field — no schema", () => {
    it("should render Content (JSON) label and no JsonForms when no contentSchema is provided", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
      expect(screen.queryByTestId("json-forms")).not.toBeInTheDocument();
    });

    it("should render Content (JSON) label when contentSchema is an empty object", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} contentSchema={{}} />);

      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
    });

    it("should initialise Content textarea with {} when no translation is provided", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      expect(contentTextarea()).toHaveValue("{}");
    });

    it("should initialise Content textarea with pretty-printed JSON from translation.content", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "My Service",
            description: "",
            content: { key: "value" },
          }}
        />,
      );

      expect(contentTextarea()).toHaveValue(
        JSON.stringify({ key: "value" }, null, 2),
      );
    });
  });

  describe("content field — with schema", () => {
    it("should render JsonForms and hide the Content (JSON) textarea when contentSchema has properties", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          contentSchema={{ type: "object", properties: { field: { type: "string" } } }}
        />,
      );

      expect(screen.getByTestId("json-forms")).toBeInTheDocument();
      expect(screen.queryByText("Content (JSON)")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable Name and Description fields when isDraft is false", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(nameInput()).toBeDisabled();
      expect(descriptionTextarea()).toBeDisabled();
    });

    it("should enable Name and Description fields when isDraft is true", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      expect(nameInput()).not.toBeDisabled();
      expect(descriptionTextarea()).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should call mutate with trimmed name and description on valid submit", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "  Natural Resources Portal  ",
            description: "  A portal for NR services  ",
            content: {},
          }}
        />,
      );

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "en",
          name: "Natural Resources Portal",
          description: "A portal for NR services",
          content: {},
        }),
        expect.any(Object),
      );
    });

    it("should call toast.error and not mutate when name is empty", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(toast.error).toHaveBeenCalledWith("Name is required");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should call toast.error and not mutate when Content JSON is invalid", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      fireEvent.change(nameInput(), { target: { value: "Valid Name" } });
      fireEvent.change(contentTextarea(), {
        target: { value: "{ invalid json" },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(toast.error).toHaveBeenCalledWith("Invalid JSON in content field");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should send undefined for description when the field is blank", () => {
      render(
        <ServiceTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "My Service",
            description: "",
            content: {},
          }}
        />,
      );

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
        expect.any(Object),
      );
    });

    it("should pass parsed JSON object as content when textarea contains valid JSON", () => {
      render(<ServiceTranslationForm {...BASE_PROPS} />);

      fireEvent.change(nameInput(), { target: { value: "My Service" } });
      fireEvent.change(contentTextarea(), {
        target: { value: '{"section":"eligibility"}' },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ content: { section: "eligibility" } }),
        expect.any(Object),
      );
    });
  });
});
