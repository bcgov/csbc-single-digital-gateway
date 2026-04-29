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
  // Input renders as <input> — role=textbox, index 0 in getAllByRole
  Input: ({ disabled, value, onChange, required }: any) => (
    <input disabled={disabled} value={value} onChange={onChange} required={required} />
  ),
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  // Each Textarea renders as <textarea> — role=textbox, indices 1+ in getAllByRole
  Textarea: ({ disabled, value, onChange, rows, className }: any) => (
    <textarea disabled={disabled} value={value} onChange={onChange} rows={rows} className={className} />
  ),
}));

const mockMutate = jest.fn();
jest.mock(
  "src/features/admin/consent-documents/data/consent-documents.mutations",
  () => ({
    useUpsertDocTranslation: () => ({
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

import { toast } from "sonner";
import { DocTranslationForm } from "src/features/admin/consent-documents/components/doc-translation-form.component";

const BASE_PROPS = {
  docId: "doc-abc",
  versionId: "ver-xyz",
  locale: "en",
  isDraft: true,
};

const TRANSLATION_BASE = {
  id: "tr-111",
  consentDocumentVersionId: "ver-xyz",
  createdAt: "2024-07-01T00:00:00.000Z",
  updatedAt: "2024-07-01T00:00:00.000Z",
};

// DOM field order (getAllByRole("textbox")):
//   [0] = <input>    → Name
//   [1] = <textarea> → Description
//   [2] = <textarea> → Content (JSON) — only present when no schema

function nameInput() {
  return screen.getAllByRole("textbox")[0];
}
function descriptionTextarea() {
  return screen.getAllByRole("textbox")[1];
}
function contentTextarea() {
  return screen.getAllByRole("textbox")[2];
}

describe("DocTranslationForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    (toast.error as jest.Mock).mockReset();
    (toast.success as jest.Mock).mockReset();
  });

  afterEach(cleanup);

  describe("field rendering", () => {
    it("should render Name, Description, and Content (JSON) fields", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
    });

    it("should pre-populate name input from the translation prop", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Patient Consent Form",
            description: "Standard patient consent",
            content: {},
          }}
        />,
      );

      expect(nameInput()).toHaveValue("Patient Consent Form");
    });

    it("should pre-populate description textarea from the translation prop", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Patient Consent Form",
            description: "Standard patient consent",
            content: {},
          }}
        />,
      );

      expect(descriptionTextarea()).toHaveValue("Standard patient consent");
    });

    it("should render the Save Translation button when isDraft is true", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      expect(
        screen.getByRole("button", { name: "Save Translation" }),
      ).toBeInTheDocument();
    });

    it("should not render the Save Translation button when isDraft is false", () => {
      render(<DocTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(
        screen.queryByRole("button", { name: "Save Translation" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("content field — no schema", () => {
    it("should render Content (JSON) label and no JsonForms when no contentSchema is provided", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
      expect(screen.queryByTestId("json-forms")).not.toBeInTheDocument();
    });

    it("should render Content (JSON) label when contentSchema is an empty object", () => {
      render(<DocTranslationForm {...BASE_PROPS} contentSchema={{}} />);

      expect(screen.getByText("Content (JSON)")).toBeInTheDocument();
    });

    it("should initialise Content textarea with {} when no translation is provided", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      expect(contentTextarea()).toHaveValue("{}");
    });

    it("should initialise Content textarea with pretty-printed JSON from translation.content", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Data Sharing Agreement",
            description: "",
            content: { section: "privacy" },
          }}
        />,
      );

      expect(contentTextarea()).toHaveValue(
        JSON.stringify({ section: "privacy" }, null, 2),
      );
    });
  });

  describe("content field — with schema", () => {
    it("should render JsonForms and hide Content (JSON) textarea when contentSchema has properties", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          contentSchema={{ type: "object", properties: { clause: { type: "string" } } }}
        />,
      );

      expect(screen.getByTestId("json-forms")).toBeInTheDocument();
      expect(screen.queryByText("Content (JSON)")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable Name and Description fields when isDraft is false", () => {
      render(<DocTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(nameInput()).toBeDisabled();
      expect(descriptionTextarea()).toBeDisabled();
    });

    it("should enable Name and Description fields when isDraft is true", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      expect(nameInput()).not.toBeDisabled();
      expect(descriptionTextarea()).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should call mutate with trimmed name and description on valid submit", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "  Organ Donor Consent  ",
            description: "  Consent for organ donation  ",
            content: { accepted: true },
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
          name: "Organ Donor Consent",
          description: "Consent for organ donation",
          content: { accepted: true },
        }),
        expect.any(Object),
      );
    });

    it("should call toast.error and not mutate when name is empty", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(toast.error).toHaveBeenCalledWith("Name is required");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should call toast.error and not mutate when Content JSON is invalid", () => {
      render(<DocTranslationForm {...BASE_PROPS} />);

      fireEvent.change(nameInput(), { target: { value: "Valid Name" } });
      fireEvent.change(contentTextarea(), {
        target: { value: "not-valid-json" },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(toast.error).toHaveBeenCalledWith("Invalid JSON in content field");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should send undefined for description when the field is blank", () => {
      render(
        <DocTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Consent Doc",
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
      render(<DocTranslationForm {...BASE_PROPS} />);

      fireEvent.change(nameInput(), { target: { value: "Privacy Notice" } });
      fireEvent.change(contentTextarea(), {
        target: { value: '{"clause":"data_sharing"}' },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
      );

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ content: { clause: "data_sharing" } }),
        expect.any(Object),
      );
    });
  });
});
