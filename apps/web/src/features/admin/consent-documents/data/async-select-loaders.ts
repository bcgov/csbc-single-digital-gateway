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
    options: data.data.map((u: { id: string; name: string }) => ({
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

export const loadDocumentTypes: AsyncLoadOptions = async (
  search,
  _loadedOptions,
  additional,
) => {
  const page = additional?.page ?? 1;
  const { data } = await api.get("/admin/consent/document-types/published", {
    params: { page, limit: 10, ...(search && { search }) },
  });

  return {
    options: data.data.map(
      (t: { id: string; name: string | null }) => ({
        value: t.id,
        label: t.name ?? t.id,
      }),
    ),
    hasMore: page < data.totalPages,
    additional: { page: page + 1 },
  };
};

export async function resolveDocumentType(
  value: string | string[],
): Promise<SelectOption[]> {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) return [];
  const { data } = await api.get(`/admin/consent/document-types/${id}`);

  const enTranslation = data.publishedVersion?.translations?.find(
    (t: { locale: string }) => t.locale === "en",
  );
  const label = enTranslation?.name ?? data.id;

  return [{ value: data.id, label }];
}
