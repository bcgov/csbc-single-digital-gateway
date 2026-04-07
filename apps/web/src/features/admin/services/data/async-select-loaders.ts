import type { GroupBase } from "react-select";
import type { LoadOptions } from "react-select-async-paginate";
import { api } from "../../../../api/api.client";

interface SelectOption {
  value: string;
  label: string;
}

type PageAdditional = { page: number };

type AsyncLoadOptions = LoadOptions<
  SelectOption,
  GroupBase<SelectOption>,
  PageAdditional
>;

const SDG_CATEGORIES: SelectOption[] = [
  { value: "culture", label: "Culture" },
  { value: "education", label: "Education" },
  { value: "employment", label: "Employment" },
  { value: "environment", label: "Environment" },
  { value: "family", label: "Family" },
  { value: "health", label: "Health" },
  { value: "housing", label: "Housing" },
  { value: "justice", label: "Justice" },
  { value: "social-protection", label: "Social Protection" },
  { value: "transport", label: "Transport" },
];

export const loadCategories: AsyncLoadOptions = async (search) => ({
  options: SDG_CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  ),
  hasMore: false,
});

export async function resolveCategory(
  value: string | string[],
): Promise<SelectOption[]> {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((v) => SDG_CATEGORIES.find((c) => c.value === v))
    .filter(Boolean) as SelectOption[];
}

export const loadOrgUnits: AsyncLoadOptions = async (
  search,
  _loadedOptions,
  additional,
) => {
  const page = additional?.page ?? 1;
  const { data } = await api.get("/admin/org-units", {
    params: { page, limit: 10, ...(search && { search }) },
  });

  return {
    options: data.docs.map((u: { id: string; name: string }) => ({
      value: u.id,
      label: u.name,
    })),
    hasMore: page < data.totalPages,
    additional: { page: page + 1 },
  };
};

export async function resolveOrgUnit(
  value: string | string[],
): Promise<SelectOption[]> {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) return [];
  const { data } = await api.get(`/admin/org-units/${id}`);
  return [{ value: data.id, label: data.name }];
}

export const loadServiceTypes: AsyncLoadOptions = async (
  search,
  _loadedOptions,
  additional,
) => {
  const page = additional?.page ?? 1;
  const { data } = await api.get("/admin/service-types/published", {
    params: { page, limit: 10, ...(search && { search }) },
  });

  return {
    options: data.docs.map(
      (t: { id: string; name: string | null }) => ({
        value: t.id,
        label: t.name ?? t.id,
      }),
    ),
    hasMore: page < data.totalPages,
    additional: { page: page + 1 },
  };
};

export async function resolveServiceType(
  value: string | string[],
): Promise<SelectOption[]> {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) return [];
  const { data } = await api.get(`/admin/service-types/${id}`);

  const enTranslation = data.publishedVersion?.translations?.find(
    (t: { locale: string }) => t.locale === "en",
  );
  const label = enTranslation?.name ?? data.id;

  return [{ value: data.id, label }];
}
