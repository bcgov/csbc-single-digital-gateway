import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@repo/ui", () => ({
  Button: ({ children, onClick, disabled, type, variant, size, ...props }: any) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

const mockMutate = jest.fn();
jest.mock(
  "src/features/admin/service-types/data/service-types.mutations",
  () => ({
    useUpsertServiceTypeVersionTranslation: () => ({
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

// Track the most recent onChange so tests can drive form state
let latestOnChange: ((event: { data: unknown }) => void) | undefined;

jest.mock("@jsonforms/react", () => ({
  JsonForms: ({ onChange, readonly }: any) => {
    latestOnChange = onChange;
    return (
      <div
        data-testid="json-forms"
        data-readonly={String(readonly ?? false)}
      />
    );
  },
}));

jest.mock(
  "src/features/admin/jsonforms-studio/util/launcher",
  () => ({
    openStudio: jest.fn(() => jest.fn()),
  }),
);

import { toast } from "sonner";
import { openStudio } from "src/features/admin/jsonforms-studio/util/launcher";
import { ServiceTypeVersionTranslationForm } from "src/features/admin/service-types/components/service-type-version-translation-form.component";

const BASE_PROPS = {
  typeId: "type-111",
  versionId: "ver-222",
  locale: "en",
  isDraft: true,
};

const TRANSLATION_BASE = {
  id: "tr-111",
  serviceTypeVersionId: "ver-222",
  createdAt: "2024-07-01T00:00:00.000Z",
  updatedAt: "2024-07-01T00:00:00.000Z",
};

function submitForm() {
  fireEvent.submit(
    screen.getByRole("button", { name: "Save Translation" }).closest("form")!,
  );
}

describe("ServiceTypeVersionTranslationForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    (toast.error as jest.Mock).mockReset();
    (toast.success as jest.Mock).mockReset();
    (openStudio as jest.Mock).mockReset();
    (openStudio as jest.Mock).mockReturnValue(jest.fn());
    latestOnChange = undefined;
  });

  afterEach(cleanup);

  describe("field rendering", () => {
    it("should render the JsonForms meta editor", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      expect(screen.getAllByTestId("json-forms").length).toBeGreaterThanOrEqual(1);
    });

    it("should render 'Form definition' section label", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      expect(screen.getByText("Form definition")).toBeInTheDocument();
    });

    it("should render 'Open in Studio' button when isDraft is true", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      expect(
        screen.getByRole("button", { name: "Open in Studio" }),
      ).toBeInTheDocument();
    });

    it("should render 'View in Studio' button when isDraft is false", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(
        screen.getByRole("button", { name: "View in Studio" }),
      ).toBeInTheDocument();
    });

    it("should render 'Save Translation' button when isDraft is true", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      expect(
        screen.getByRole("button", { name: "Save Translation" }),
      ).toBeInTheDocument();
    });

    it("should not render 'Save Translation' button when isDraft is false", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} isDraft={false} />);

      expect(
        screen.queryByRole("button", { name: "Save Translation" }),
      ).not.toBeInTheDocument();
    });

    it("should show 'No form definition yet' message when schema and uiSchema are both empty", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      expect(
        screen.getByText("No form definition yet. Open the Studio to build one."),
      ).toBeInTheDocument();
    });

    it("should NOT show 'No form definition yet' message when translation has schema", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Service Type",
            description: "A service type",
            schema: { type: "object", properties: { field: { type: "string" } } },
            uiSchema: { type: "VerticalLayout", elements: [] },
          }}
        />,
      );

      expect(
        screen.queryByText("No form definition yet. Open the Studio to build one."),
      ).not.toBeInTheDocument();
    });
  });

  describe("form submission — validation", () => {
    it("should call toast.error 'Name is required' when name is empty and not call mutate", () => {
      render(<ServiceTypeVersionTranslationForm {...BASE_PROPS} />);

      submitForm();

      expect(toast.error).toHaveBeenCalledWith("Name is required");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should call toast.error 'Description is required' when name is set but description is empty", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Employment Services",
            description: "",
            schema: {},
            uiSchema: {},
          }}
        />,
      );

      submitForm();

      expect(toast.error).toHaveBeenCalledWith("Description is required");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("should call mutate with correct payload when name and description are both provided", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Employment Services",
            description: "Provincial employment portal",
            schema: {},
            uiSchema: {},
          }}
        />,
      );

      submitForm();

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "en",
          name: "Employment Services",
          description: "Provincial employment portal",
        }),
        expect.any(Object),
      );
    });

    it("should include schema and uiSchema in the mutate payload", () => {
      const schema = { type: "object", properties: { category: { type: "string" } } };
      const uiSchema = { type: "VerticalLayout", elements: [] };

      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "My Service Type",
            description: "Type description",
            schema,
            uiSchema,
          }}
        />,
      );

      submitForm();

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ schema, uiSchema }),
        expect.any(Object),
      );
    });

    it("should update name and description via JsonForms onChange before submitting", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "Old Name",
            description: "Old Description",
            schema: {},
            uiSchema: {},
          }}
        />,
      );

      // Simulate JsonForms driving a state update — must be wrapped in act()
      act(() => {
        latestOnChange?.({ data: { name: "New Name", description: "New Description" } });
      });

      submitForm();

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Name", description: "New Description" }),
        expect.any(Object),
      );
    });
  });

  describe("studio integration", () => {
    it("should call openStudio when the Studio button is clicked", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "My Type",
            description: "Type description",
            schema: {},
            uiSchema: {},
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open in Studio" }));

      expect(openStudio).toHaveBeenCalledTimes(1);
      expect(openStudio).toHaveBeenCalledWith(
        expect.objectContaining({
          readonly: false,
          onApply: expect.any(Function),
        }),
      );
    });

    it("should pass readonly=true to openStudio when isDraft is false", () => {
      render(
        <ServiceTypeVersionTranslationForm
          {...BASE_PROPS}
          isDraft={false}
          translation={{
            ...TRANSLATION_BASE,
            locale: "en",
            name: "My Type",
            description: "Type description",
            schema: {},
            uiSchema: {},
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "View in Studio" }));

      expect(openStudio).toHaveBeenCalledWith(
        expect.objectContaining({ readonly: true }),
      );
    });
  });
});
